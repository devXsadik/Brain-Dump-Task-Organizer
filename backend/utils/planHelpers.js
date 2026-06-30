/** Plan helpers — plus includes legacy 'premium' mapped to pro at guard level */

export const PLUS_PLANS = ['plus', 'premium', 'pro'];
export const PRO_PLANS = ['pro', 'premium'];

export const isPlusPlan = (plan) => PLUS_PLANS.includes(plan);
export const isProPlan = (plan) => PRO_PLANS.includes(plan);

export const normalizePlan = (plan) => {
  if (plan === 'premium') return 'pro';
  return plan || 'free';
};

export const getAiDumpLimit = (plan) => {
  const p = normalizePlan(plan);
  if (p === 'free') return 3;
  if (p === 'plus') return 100;
  if (p === 'pro') return 200;
  return 0;
};

export const getVoiceCommandLimit = (plan) => {
  if (!isProPlan(plan)) return 0;
  return 50;
};

export const getDailyBriefLimit = (plan) => {
  const p = normalizePlan(plan);
  if (p === 'free') return 0;
  if (p === 'plus') return 1;
  if (p === 'pro') return 999;
  return 0;
};
