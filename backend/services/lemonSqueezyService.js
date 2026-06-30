import crypto from 'node:crypto';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

const API_BASE = 'https://api.lemonsqueezy.com/v1';

const VARIANT_MAP = {
  'plus-monthly': process.env.LEMONSQUEEZY_PLUS_MONTHLY_VARIANT_ID,
  'plus-annual': process.env.LEMONSQUEEZY_PLUS_ANNUAL_VARIANT_ID,
  'pro-monthly': process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID,
  'pro-annual': process.env.LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID,
};

const getApiKey = () => {
  const key = process.env.LEMONSQUEEZY_API_KEY;
  if (!key) throw new AppError(500, 'Lemon Squeezy API key not configured');
  return key;
};

const getStoreId = () => {
  const id = process.env.LEMONSQUEEZY_STORE_ID;
  if (!id) throw new AppError(500, 'Lemon Squeezy store ID not configured');
  return id;
};

const resolveVariantId = (plan, billing) => {
  const key = `${plan}-${billing}`;
  const variantId = VARIANT_MAP[key];
  if (!variantId) {
    throw new AppError(500, `Lemon Squeezy variant not configured for ${plan} ${billing}`);
  }
  return variantId;
};

const lsFetch = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${getApiKey()}`,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    logger.error({ status: res.status, data }, 'Lemon Squeezy API error');
    throw new AppError(502, data?.errors?.[0]?.detail || 'Lemon Squeezy request failed');
  }

  return data;
};

export const createLemonCheckout = async ({ user, plan, billing }) => {
  const variantId = resolveVariantId(plan, billing);
  const storeId = getStoreId();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const testMode = process.env.LEMONSQUEEZY_TEST_MODE === 'true';

  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        test_mode: testMode,
        product_options: {
          redirect_url: `${frontendUrl}/dashboard?upgraded=true&plan=${plan}&provider=lemonsqueezy`,
          enabled_variants: [parseInt(variantId, 10)],
        },
        checkout_options: {
          embed: false,
          desc: true,
          discount: true,
          skip_trial: plan !== 'pro' || billing !== 'monthly',
        },
        checkout_data: {
          email: user.email,
          name: user.name,
          custom: {
            user_id: user._id.toString(),
            plan,
            billing,
          },
        },
      },
      relationships: {
        store: { data: { type: 'stores', id: storeId.toString() } },
        variant: { data: { type: 'variants', id: variantId.toString() } },
      },
    },
  };

  const result = await lsFetch('/checkouts', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const url = result?.data?.attributes?.url;
  if (!url) throw new AppError(502, 'Failed to create Lemon Squeezy checkout URL');

  return url;
};

export const getLemonCustomerPortalUrl = async (subscriptionId) => {
  const result = await lsFetch(`/subscriptions/${subscriptionId}`);
  const portalUrl = result?.data?.attributes?.urls?.customer_portal;
  if (!portalUrl) {
    throw new AppError(400, 'Customer portal URL not available for this subscription');
  }
  return portalUrl;
};

export const verifyLemonWebhook = (rawBody, signature) => {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) throw new Error('LEMONSQUEEZY_WEBHOOK_SECRET not configured');

  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
  const sig = Buffer.from(signature || '', 'utf8');

  if (digest.length !== sig.length || !crypto.timingSafeEqual(digest, sig)) {
    throw new Error('Invalid Lemon Squeezy webhook signature');
  }
};

const mapLemonStatus = (status) => {
  switch (status) {
    case 'active':
      return { status: 'active', planActive: true };
    case 'on_trial':
      return { status: 'trialing', planActive: true };
    case 'past_due':
    case 'unpaid':
      return { status: 'past_due', planActive: true };
    case 'cancelled':
    case 'expired':
      return { status: 'canceled', planActive: false };
    case 'paused':
      return { status: 'past_due', planActive: true };
    default:
      return { status: 'active', planActive: true };
  }
};

export const parseLemonWebhookEvent = (payload) => {
  const eventName = payload?.meta?.event_name;
  const customData = payload?.meta?.custom_data || {};
  const attrs = payload?.data?.attributes || {};

  const userId = customData.user_id?.toString();
  const planFromCustom = customData.plan;
  const subscriptionId = payload?.data?.id?.toString();
  const customerId = attrs.customer_id?.toString();
  const variantId = attrs.variant_id?.toString();
  const lemonStatus = attrs.status;
  const mapped = mapLemonStatus(lemonStatus);

  let plan = planFromCustom || 'pro';
  if (!planFromCustom && variantId) {
    for (const [key, id] of Object.entries(VARIANT_MAP)) {
      if (id?.toString() === variantId) {
        plan = key.split('-')[0];
        break;
      }
    }
  }

  const renewsAt = attrs.renews_at ? new Date(attrs.renews_at) : null;
  const trialEndsAt = attrs.trial_ends_at ? new Date(attrs.trial_ends_at) : null;

  return {
    eventName,
    userId,
    plan,
    subscriptionId,
    customerId,
    mapped,
    renewsAt,
    trialEndsAt,
  };
};
