import OpenAI from 'openai';
import { z } from 'zod';
import { SYSTEM_PROMPT } from '../prompts/systemPrompt.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

import { HfInference } from '@huggingface/inference';

const taskSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(1000).default(''),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  category: z.enum(['today', 'this_week', 'backlog']),
  tags: z.array(z.string()).max(10).default([]),
  estimatedMinutes: z.number().min(1).max(1440).nullable().default(null),
  isMeeting: z.boolean().default(false),
  meetingTime: z.string().nullable().default(null),
});

export const processRawDump = async (rawText) => {
  if (!rawText || typeof rawText !== 'string' || rawText.length > 5000) {
    throw new AppError(400, 'Invalid input: text must be a string between 1 and 5000 characters.');
  }

  const provider = (process.env.AI_PROVIDER || 'groq').split('#')[0].trim();

  const isComplex = (text) => {
    if (text.length > 400) return true;
    const keywords = ['meet', 'schedule', 'call', 'zoom', 'tomorrow at', 'pm', 'am', ':00', ':30'];
    const lower = text.toLowerCase();
    return keywords.some((kw) => lower.includes(kw));
  };

  const callGroq = async (text) => {
    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT() },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });
    return response.choices[0].message.content;
  };

  const callHuggingFace = async (text) => {
    const hf = new HfInference(process.env.HF_TOKEN);
    const response = await hf.chatCompletion({
      model: process.env.HF_MODEL || 'meta-llama/Meta-Llama-3-70B-Instruct',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT() },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });
    return response.choices[0].message.content;
  };

  const parseAndValidate = (content) => {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      content = jsonMatch[1].trim();
    } else {
      const firstBracket = content.indexOf('[');
      const lastBracket = content.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        content = content.slice(firstBracket, lastBracket + 1);
      }
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      throw new Error('invalid_json');
    }

    if (!Array.isArray(parsed) && parsed.tasks && Array.isArray(parsed.tasks)) {
      parsed = parsed.tasks;
    } else if (!Array.isArray(parsed) && parsed.items && Array.isArray(parsed.items)) {
      parsed = parsed.items;
    } else if (!Array.isArray(parsed)) {
      throw new Error('invalid_array');
    }

    const validTasks = [];
    for (const item of parsed) {
      const validationResult = taskSchema.safeParse(item);
      if (validationResult.success) {
        validTasks.push(validationResult.data);
      } else {
        logger.warn({ item, error: validationResult.error }, 'Invalid task object from AI, skipping');
      }
    }
    return validTasks;
  };

  const executeProvider = async (pName) => {
    let content;
    if (pName === 'groq') content = await callGroq(rawText);
    else if (pName === 'huggingface') content = await callHuggingFace(rawText);
    else throw new AppError(500, `Unknown AI provider: ${pName}`);

    return parseAndValidate(content);
  };

  const providers = ['groq', 'huggingface'];

  try {
    let chosenProvider = provider;
    if (provider === 'hybrid') {
      chosenProvider = isComplex(rawText) ? 'huggingface' : 'groq';
    }

    if (!providers.includes(chosenProvider)) {
      throw new AppError(500, `Invalid AI provider configured: ${chosenProvider}`);
    }

    try {
      return await executeProvider(chosenProvider);
    } catch (e) {
      if (provider === 'hybrid') {
        const fallback = chosenProvider === 'groq' ? 'huggingface' : 'groq';
        logger.warn({ error: e.message, chosenProvider, fallback }, 'Provider failed in hybrid mode, falling back');
        return await executeProvider(fallback);
      }
      throw e;
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.message === 'invalid_json' || error.message === 'invalid_array') {
      throw new AppError(502, 'AI returned invalid JSON structure');
    }
    logger.error({ error }, 'AI API Error');
    throw new AppError(500, 'Failed to process task dump via AI service');
  }
};
