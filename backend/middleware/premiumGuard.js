import AppError from '../utils/AppError.js';
import { isPlusPlan, isProPlan } from '../utils/planHelpers.js';

export const plusGuard = (req, res, next) => {
  const plan = req.user?.subscription?.plan;

  if (!isPlusPlan(plan)) {
    return next(
      new AppError(403, 'AI-powered features require a Plus or Pro plan. Upgrade to unlock.', true)
    );
  }

  next();
};

export const proGuard = (req, res, next) => {
  const plan = req.user?.subscription?.plan;

  if (!isProPlan(plan)) {
    return next(
      new AppError(403, 'This feature requires a Pro plan. Upgrade to unlock voice, calendar, and more.', true)
    );
  }

  next();
};

/** @deprecated use plusGuard */
export const premiumGuard = plusGuard;
