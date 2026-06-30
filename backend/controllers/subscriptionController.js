import Stripe from 'stripe';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';
import { trackUserEvent } from '../utils/analytics.js';
import {
  createLemonCheckout,
  getLemonCustomerPortalUrl,
  verifyLemonWebhook,
  parseLemonWebhookEvent,
} from '../services/lemonSqueezyService.js';

const getPaymentProvider = () =>
  (process.env.PAYMENT_PROVIDER || 'lemonsqueezy').toLowerCase();

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

const STRIPE_PRICE_MAP = {
  'plus-monthly': process.env.STRIPE_PLUS_PRICE_ID || process.env.STRIPE_PREMIUM_PRICE_ID,
  'plus-annual': process.env.STRIPE_PLUS_ANNUAL_PRICE_ID,
  'pro-monthly': process.env.STRIPE_PRO_PRICE_ID,
  'pro-annual': process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
};

const resolveStripePriceId = (plan, billing) => {
  const priceId = STRIPE_PRICE_MAP[`${plan}-${billing}`];
  if (!priceId) throw new AppError(500, `Stripe price not configured for ${plan} ${billing}`);
  return priceId;
};

const mapLegacyPlan = (plan) => (plan === 'premium' ? 'pro' : plan);

const activateSubscription = async ({
  userId,
  plan,
  provider,
  subscriptionId,
  customerId,
  status,
  currentPeriodEnd,
  trialEndsAt,
}) => {
  if (!userId) return;

  const normalizedPlan = mapLegacyPlan(plan);

  const update = {
    'subscription.provider': provider,
    'subscription.status': status,
    'subscription.plan': normalizedPlan,
    'subscription.currentPeriodEnd': currentPeriodEnd || null,
    'subscription.trialEndsAt': trialEndsAt || null,
  };

  if (provider === 'stripe') {
    update['subscription.stripeSubscriptionId'] = subscriptionId;
    update['subscription.stripeCustomerId'] = customerId;
  } else {
    update['subscription.lemonSubscriptionId'] = subscriptionId;
    update['subscription.lemonCustomerId'] = customerId;
  }

  await User.findByIdAndUpdate(userId, update);

  trackUserEvent(userId, 'checkout_completed', { plan: normalizedPlan, provider });
  logger.info({ userId, plan: normalizedPlan, provider }, 'Subscription activated');
};

const deactivateSubscription = async ({ userId, subscriptionId, provider }) => {
  const filter = userId
    ? { _id: userId }
    : provider === 'lemonsqueezy'
      ? { 'subscription.lemonSubscriptionId': subscriptionId }
      : { 'subscription.stripeSubscriptionId': subscriptionId };

  await User.findOneAndUpdate(filter, {
    'subscription.status': 'canceled',
    'subscription.plan': 'free',
    'subscription.currentPeriodEnd': null,
    'subscription.trialEndsAt': null,
    ...(provider === 'lemonsqueezy'
      ? { 'subscription.lemonSubscriptionId': null }
      : { 'subscription.stripeSubscriptionId': null }),
  });
};

// ─── Stripe checkout (legacy fallback) ───

const createStripeCheckout = async (req, res) => {
  const stripe = getStripe();
  const user = req.user;
  const plan = req.body?.plan === 'plus' ? 'plus' : 'pro';
  const billing = req.body?.billing === 'annual' ? 'annual' : 'monthly';

  let customerId = user.subscription?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user._id.toString() },
    });
    customerId = customer.id;
    await User.findByIdAndUpdate(user._id, {
      'subscription.stripeCustomerId': customerId,
      'subscription.provider': 'stripe',
    });
  }

  const sessionConfig = {
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: resolveStripePriceId(plan, billing), quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/dashboard?upgraded=true&plan=${plan}`,
    cancel_url: `${process.env.FRONTEND_URL}/pricing?canceled=true`,
    metadata: { userId: user._id.toString(), plan, billing },
    subscription_data: { metadata: { userId: user._id.toString(), plan } },
  };

  if (plan === 'pro' && billing === 'monthly') {
    sessionConfig.subscription_data.trial_period_days = 7;
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);
  trackUserEvent(user._id, 'upgrade_clicked', { plan, billing, provider: 'stripe' });
  res.status(200).json({ success: true, url: session.url, provider: 'stripe' });
};

// ─── Lemon Squeezy checkout ───

const createLemonCheckoutHandler = async (req, res) => {
  const user = req.user;
  const plan = req.body?.plan === 'plus' ? 'plus' : 'pro';
  const billing = req.body?.billing === 'annual' ? 'annual' : 'monthly';

  const url = await createLemonCheckout({ user, plan, billing });
  trackUserEvent(user._id, 'upgrade_clicked', { plan, billing, provider: 'lemonsqueezy' });
  res.status(200).json({ success: true, url, provider: 'lemonsqueezy' });
};

export const createCheckout = asyncHandler(async (req, res) => {
  if (getPaymentProvider() === 'stripe') {
    return createStripeCheckout(req, res);
  }
  return createLemonCheckoutHandler(req, res);
});

export const createPortal = asyncHandler(async (req, res, next) => {
  const user = req.user;
  const provider = user.subscription?.provider || getPaymentProvider();

  if (provider === 'lemonsqueezy' || user.subscription?.lemonSubscriptionId) {
    const subId = user.subscription?.lemonSubscriptionId;
    if (!subId) return next(new AppError(400, 'No Lemon Squeezy subscription found. Subscribe first.'));
    const url = await getLemonCustomerPortalUrl(subId);
    return res.status(200).json({ success: true, url, provider: 'lemonsqueezy' });
  }

  const stripe = getStripe();
  if (!user.subscription?.stripeCustomerId) {
    return next(new AppError(400, 'No billing account found. Subscribe first.'));
  }
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.subscription.stripeCustomerId,
    return_url: `${process.env.FRONTEND_URL}/dashboard`,
  });
  res.status(200).json({ success: true, url: portalSession.url, provider: 'stripe' });
});

// ─── Lemon Squeezy webhook ───

const handleLemonWebhook = async (req, res) => {
  const signature = req.headers['x-signature'];

  try {
    verifyLemonWebhook(req.body, signature);
  } catch (err) {
    logger.error({ err }, 'Lemon Squeezy webhook signature verification failed');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString());
  } catch {
    return res.status(400).send('Invalid JSON payload');
  }

  try {
    const event = parseLemonWebhookEvent(payload);
    const { eventName, userId, plan, subscriptionId, customerId, mapped, renewsAt, trialEndsAt } = event;

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_resumed':
      case 'subscription_payment_success': {
        if (!mapped.planActive) {
          await deactivateSubscription({ userId, subscriptionId, provider: 'lemonsqueezy' });
          break;
        }
        await activateSubscription({
          userId,
          plan,
          provider: 'lemonsqueezy',
          subscriptionId,
          customerId,
          status: mapped.status,
          currentPeriodEnd: renewsAt,
          trialEndsAt,
        });
        break;
      }

      case 'subscription_cancelled':
      case 'subscription_expired': {
        await deactivateSubscription({ userId, subscriptionId, provider: 'lemonsqueezy' });
        logger.info({ userId, subscriptionId }, 'Lemon Squeezy subscription canceled');
        break;
      }

      case 'subscription_payment_failed': {
        if (userId) {
          await User.findByIdAndUpdate(userId, { 'subscription.status': 'past_due' });
        } else if (subscriptionId) {
          await User.findOneAndUpdate(
            { 'subscription.lemonSubscriptionId': subscriptionId },
            { 'subscription.status': 'past_due' }
          );
        }
        break;
      }

      default:
        logger.info({ eventName }, 'Unhandled Lemon Squeezy webhook event');
    }
  } catch (err) {
    logger.error({ err }, 'Error processing Lemon Squeezy webhook');
  }

  res.status(200).json({ received: true });
};

// ─── Stripe webhook (legacy) ───

const handleStripeWebhook = async (req, res) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error({ err }, 'Stripe webhook signature verification failed');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const plan = mapLegacyPlan(session.metadata?.plan || 'pro');
        if (userId) {
          await activateSubscription({
            userId,
            plan,
            provider: 'stripe',
            subscriptionId: session.subscription,
            customerId: session.customer,
            status: 'active',
            trialEndsAt: plan === 'pro' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await deactivateSubscription({
          subscriptionId: subscription.id,
          provider: 'stripe',
        });
        break;
      }
      case 'invoice.payment_failed': {
        const customerId = event.data.object.customer;
        await User.findOneAndUpdate(
          { 'subscription.stripeCustomerId': customerId },
          { 'subscription.status': 'past_due' }
        );
        break;
      }
    }
  } catch (err) {
    logger.error({ err, eventType: event.type }, 'Error processing Stripe webhook');
  }

  res.status(200).json({ received: true });
};

export const handleWebhook = async (req, res) => {
  const provider = getPaymentProvider();

  if (provider === 'lemonsqueezy') {
    return handleLemonWebhook(req, res);
  }
  return handleStripeWebhook(req, res);
};

export const getPaymentInfo = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    provider: getPaymentProvider(),
  });
});
