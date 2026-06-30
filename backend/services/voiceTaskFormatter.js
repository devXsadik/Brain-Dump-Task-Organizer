import OpenAI from 'openai';
import { z } from 'zod';
import { todayContext } from './voiceDateParser.js';
import logger from '../utils/logger.js';

const polishSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(500).default(''),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  tags: z.array(z.string()).max(5).default([]),
});

const FORMAT_PROMPT = (spokenToday, hints = {}) => {
  let hintBlock = '';
  if (hints.scheduledWhen) hintBlock += `Scheduled for: ${hints.scheduledWhen}\n`;
  if (hints.isMeeting) hintBlock += 'This is a meeting/call.\n';
  if (hints.forcedCategory) hintBlock += `Kanban column: ${hints.forcedCategory}\n`;

  return `You polish messy spoken voice commands into clean professional task objects.

Today: ${spokenToday}
${hintBlock}
The user spoke naturally — your job is to extract the BEST formatted task.

Output ONLY valid JSON:
{
  "title": "Clear actionable title (verb-first, max 120 chars). No dates/times in title.",
  "description": "1-2 short sentences of useful context from what they said. Empty string if nothing extra.",
  "priority": "low|medium|high|urgent",
  "tags": ["2-4", "lowercase", "tags"]
}

Rules:
1. Remove filler: um, like, please, I need to, can you, hey dump
2. Title = professional task name — NOT a copy of rambling speech
3. Description only when user gave context (who, why, where, details)
4. Never put dates, times, or "tomorrow" in title
5. Meetings/calls → priority high or urgent if time-sensitive
6. Examples:
   - "um add like buy milk and eggs from the store" → title: "Buy milk and eggs", description: "From the store"
   - "remind me to call dentist about the crown" → title: "Call dentist", description: "About the crown"
   - "schedule meeting with Sarah about Q3 budget" → title: "Meeting with Sarah", description: "Discuss Q3 budget"`;
};

const simplePolish = (commandText) => {
  let t = commandText
    .trim()
    .replace(/^(?:um+|uh+|like|please|hey dump|ok)\s+/gi, '')
    .replace(/^(?:add|create|new task|remind me to)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (t.length < 2) t = commandText.trim();
  const title = t.charAt(0).toUpperCase() + t.slice(1);

  const descMatch = commandText.match(/\b(?:about|regarding|for|because)\s+(.+)$/i);
  const description = descMatch?.[1]?.trim().slice(0, 500) || '';

  return polishSchema.parse({
    title: title.slice(0, 200),
    description,
    priority: 'medium',
    tags: [],
  });
};

/**
 * AI-polish a voice command into a well-formatted task title + optional description.
 */
export const polishVoiceTask = async (commandText, hints = {}) => {
  if (!commandText?.trim()) {
    return polishSchema.parse({ title: 'New task', description: '', priority: 'medium', tags: [] });
  }

  if (!process.env.GROQ_API_KEY) {
    return simplePolish(commandText);
  }

  try {
    const { spoken } = todayContext();
    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: FORMAT_PROMPT(spoken, hints) },
        { role: 'user', content: commandText },
      ],
      temperature: 0.2,
      max_tokens: 400,
    });

    let content = response.choices[0].message.content || '';
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch?.[1]) content = jsonMatch[1].trim();
    const first = content.indexOf('{');
    const last = content.lastIndexOf('}');
    if (first !== -1 && last > first) content = content.slice(first, last + 1);

    return polishSchema.parse(JSON.parse(content));
  } catch (err) {
    logger.warn({ err: err.message }, 'voiceTaskFormatter fallback to simple polish');
    return simplePolish(commandText);
  }
};

export const categoryLabel = (category) => {
  if (category === 'this_week') return 'This Week';
  if (category === 'backlog') return 'Backlog';
  return 'Today';
};
