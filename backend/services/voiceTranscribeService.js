import OpenAI from 'openai';
import AppError from '../utils/AppError.js';

const groq = () =>
  new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });

/**
 * Transcribe audio buffer via Groq Whisper (OpenAI-compatible API).
 * @param {Buffer} buffer - audio file bytes
 * @param {string} [mimetype] - e.g. audio/webm
 * @param {string} [languageHint] - ISO 639-1 optional hint
 */
export const transcribeAudio = async (buffer, mimetype = 'audio/webm', languageHint) => {
  if (!process.env.GROQ_API_KEY) {
    throw new AppError(503, 'Voice transcription is not configured.');
  }
  if (!buffer?.length) {
    throw new AppError(400, 'No audio data received.');
  }
  if (buffer.length > 10 * 1024 * 1024) {
    throw new AppError(400, 'Audio too large (max ~30s).');
  }

  const ext = mimetype.includes('wav') ? 'wav' : 'webm';
  const file = new File([buffer], `utterance.${ext}`, { type: mimetype });

  const response = await groq().audio.transcriptions.create({
    model: process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3',
    file,
    ...(languageHint ? { language: languageHint } : {}),
    response_format: 'verbose_json',
  });

  return {
    transcript: (response.text || '').trim(),
    language: response.language || languageHint || 'unknown',
    duration: response.duration,
  };
};
