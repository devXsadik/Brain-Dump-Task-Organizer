import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { getAiDumpLimit, getVoiceCommandLimit, getDailyBriefLimit, normalizePlan } from './planHelpers.js';

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const currentDay = () => new Date().toISOString().split('T')[0];

export const checkAndIncrementAiDump = async (user) => {
  const plan = user.subscription?.plan || 'free';
  const limit = getAiDumpLimit(plan);
  const month = currentMonth();

  let aiUsageCount = user.aiUsageCount || 0;
  let aiUsageMonth = user.aiUsageMonth || month;

  if (aiUsageMonth !== month) {
    aiUsageCount = 0;
    aiUsageMonth = month;
  }

  if (aiUsageCount >= limit) {
    const planName = normalizePlan(plan) === 'free' ? 'free tier' : 'your plan';
    throw new AppError(403, `AI dump limit reached for ${planName} (${limit}/month). Upgrade for more.`, true);
  }

  await User.findByIdAndUpdate(user._id, {
    aiUsageCount: aiUsageCount + 1,
    aiUsageMonth: month,
  });

  return { used: aiUsageCount + 1, limit };
};

export const checkAndIncrementVoice = async (user) => {
  const plan = user.subscription?.plan || 'free';
  const limit = getVoiceCommandLimit(plan);
  const day = currentDay();

  if (limit === 0) {
    throw new AppError(403, 'Voice commands require a Pro plan.', true);
  }

  let voiceUsageCount = user.voiceUsageCount || 0;
  let voiceUsageDay = user.voiceUsageDay || day;

  if (voiceUsageDay !== day) {
    voiceUsageCount = 0;
    voiceUsageDay = day;
  }

  if (voiceUsageCount >= limit) {
    throw new AppError(403, `Daily voice command limit reached (${limit}/day).`, true);
  }

  await User.findByIdAndUpdate(user._id, {
    voiceUsageCount: voiceUsageCount + 1,
    voiceUsageDay: day,
  });

  return { used: voiceUsageCount + 1, limit };
};

export const checkAndIncrementDailyBrief = async (user) => {
  const plan = user.subscription?.plan || 'free';
  const limit = getDailyBriefLimit(plan);
  const day = currentDay();

  if (limit === 0) {
    throw new AppError(403, 'Daily brief requires a Plus or Pro plan.', true);
  }

  let dailyBriefCount = user.dailyBriefCount || 0;
  let dailyBriefDate = user.dailyBriefDate || day;

  if (dailyBriefDate !== day) {
    dailyBriefCount = 0;
    dailyBriefDate = day;
  }

  if (dailyBriefCount >= limit) {
    throw new AppError(403, 'Daily brief limit reached for today. Upgrade to Pro for unlimited briefs.', true);
  }

  await User.findByIdAndUpdate(user._id, {
    dailyBriefCount: dailyBriefCount + 1,
    dailyBriefDate: day,
  });

  return { used: dailyBriefCount + 1, limit };
};

export const getUsageSnapshot = (user) => {
  const plan = user.subscription?.plan || 'free';
  const month = currentMonth();
  const day = currentDay();

  const aiUsed = user.aiUsageMonth === month ? (user.aiUsageCount || 0) : 0;
  const voiceUsed = user.voiceUsageDay === day ? (user.voiceUsageCount || 0) : 0;
  const briefUsed = user.dailyBriefDate === day ? (user.dailyBriefCount || 0) : 0;

  return {
    aiDumps: { used: aiUsed, limit: getAiDumpLimit(plan) },
    voiceCommands: { used: voiceUsed, limit: getVoiceCommandLimit(plan) },
    dailyBriefs: { used: briefUsed, limit: getDailyBriefLimit(plan) },
  };
};
