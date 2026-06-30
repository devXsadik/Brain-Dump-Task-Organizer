import OpenAI from 'openai';
import { DAILY_BRIEF_PROMPT } from '../prompts/dailyBriefPrompt.js';
import AppError from '../utils/AppError.js';

const callAI = async (systemPrompt, userContent) => {
  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });
  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4,
    max_tokens: 800,
  });
  return response.choices[0].message.content;
};

const parseJson = (content) => {
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch?.[1]) content = jsonMatch[1].trim();
  const first = content.indexOf('{');
  const last = content.lastIndexOf('}');
  if (first !== -1 && last > first) content = content.slice(first, last + 1);
  return JSON.parse(content);
};

export const generateDailyBrief = async (tasks) => {
  const summary = tasks
    .filter((t) => !t.isCompleted)
    .slice(0, 30)
    .map((t) => `- [${t.category}] ${t.title} (${t.priority})${t.isMeeting ? ` meeting ${t.meetingTime}` : ''}`)
    .join('\n') || 'No pending tasks.';

  try {
    const content = await callAI(DAILY_BRIEF_PROMPT(summary), 'Generate my daily focus brief.');
    return parseJson(content);
  } catch {
    throw new AppError(502, 'Failed to generate daily brief');
  }
};
