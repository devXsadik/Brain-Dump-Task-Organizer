import Task from '../models/Task.js';
import User from '../models/User.js';
import { executeVoiceCommand } from '../services/voiceCommandService.js';
import { VOICE_COMMAND_CATALOG } from '../services/voiceFastPaths.js';
import { transcribeAudio } from '../services/voiceTranscribeService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import { checkAndIncrementVoice } from '../utils/usageTracker.js';
import { trackUserEvent } from '../utils/analytics.js';

export const voiceCommand = asyncHandler(async (req, res, next) => {
  const { transcript, confirmDelete } = req.body;

  if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
    return next(new AppError(400, 'Please provide a voice transcript.'));
  }

  const user = await User.findById(req.user._id);
  await checkAndIncrementVoice(user);

  const tasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
  const startMs = Date.now();

  const result = await executeVoiceCommand(
    req.user._id,
    transcript.trim(),
    tasks,
    !!confirmDelete
  );

  trackUserEvent(req.user._id, 'voice_command_executed', {
    intent: result.intent,
    actionCount: result.actionsApplied?.length || 0,
    voice_detected_language: result.detectedLanguage,
    voice_latency_ms: result.latencyMs ?? Date.now() - startMs,
    voice_intent: result.intent,
    needs_clarification: !!result.needsClarification,
  });

  res.status(200).json({ success: true, ...result });
});

export const voiceTranscribe = asyncHandler(async (req, res, next) => {
  const { audio, mimetype, languageHint } = req.body;

  if (!audio || typeof audio !== 'string') {
    return next(new AppError(400, 'Please provide base64 audio data.'));
  }

  const user = await User.findById(req.user._id);
  await checkAndIncrementVoice(user);

  const buffer = Buffer.from(audio, 'base64');
  const result = await transcribeAudio(buffer, mimetype || 'audio/webm', languageHint);

  trackUserEvent(req.user._id, 'voice_stt_transcribe', {
    voice_stt_engine: 'whisper',
    voice_detected_language: result.language,
    duration: result.duration,
  });

  res.status(200).json({ success: true, ...result });
});

export const getVoiceSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('voiceSettings');
  const settings = user?.voiceSettings || {
    activationMode: 'always',
    replyLanguage: 'en',
    sttStrategy: 'auto',
  };
  res.status(200).json({ success: true, settings });
});

export const patchVoiceSettings = asyncHandler(async (req, res, next) => {
  const { activationMode, replyLanguage, sttStrategy } = req.body;
  const updates = {};

  if (activationMode !== undefined) {
    if (!['always', 'hey_dump', 'manual'].includes(activationMode)) {
      return next(new AppError(400, 'Invalid activationMode.'));
    }
    updates['voiceSettings.activationMode'] = activationMode;
  }
  if (replyLanguage !== undefined) {
    if (!['en', 'auto'].includes(replyLanguage)) {
      return next(new AppError(400, 'Invalid replyLanguage.'));
    }
    updates['voiceSettings.replyLanguage'] = replyLanguage;
  }
  if (sttStrategy !== undefined) {
    if (!['auto', 'browser', 'whisper'].includes(sttStrategy)) {
      return next(new AppError(400, 'Invalid sttStrategy.'));
    }
    updates['voiceSettings.sttStrategy'] = sttStrategy;
  }

  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).select(
    'voiceSettings'
  );

  res.status(200).json({ success: true, settings: user.voiceSettings });
});

export const listVoiceCommands = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    commands: VOICE_COMMAND_CATALOG,
    tips: [
      'Speak in any language — we translate to English for your tasks',
      'Choose your speaking language in the voice panel',
      'Hey Dump mode: say "Hey Dump" then your command',
      'Pause briefly after your command',
      'Safari/Firefox: uses Whisper transcription automatically',
    ],
  });
});
