import OpenAI from 'openai';
import { z } from 'zod';

const translateSchema = z.object({
  detectedLanguage: z.string().default('unknown'),
  detectedLanguageName: z.string().default('Unknown'),
  englishCommand: z.string().min(1),
});

const groqClient = () =>
  new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });

const TRANSLATE_PROMPT = `You translate voice commands for a task management app.
The user may speak in ANY language (Bengali, Hindi, Arabic, Spanish, French, Urdu, Chinese, etc.).

Return ONLY valid JSON:
{
  "detectedLanguage": "ISO 639-1 code like bn, hi, en",
  "detectedLanguageName": "Human-readable language name",
  "englishCommand": "Clear English command for the app"
}

Rules:
1. englishCommand must be a short imperative in English, e.g. "add buy milk", "complete dentist", "done", "what is on my plate"
2. Task content in englishCommand must be English (translate task titles/descriptions)
3. Map common intents: add/create → "add ...", complete/done/finish → "complete ..." or "done", delete/remove → "delete ...", list/show → "what is on my plate"
4. If already English, return the same text (trimmed) in englishCommand
5. No markdown, no extra fields`;

export const translateVoiceToEnglish = async (transcript) => {
  const originalText = transcript.trim();
  if (!originalText) {
    return {
      originalText: '',
      englishCommand: '',
      detectedLanguage: 'unknown',
      detectedLanguageName: 'Unknown',
    };
  }

  if (!process.env.GROQ_API_KEY) {
    return {
      originalText,
      englishCommand: originalText,
      detectedLanguage: 'en',
      detectedLanguageName: 'English',
    };
  }

  try {
    const response = await groqClient().chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: TRANSLATE_PROMPT },
        { role: 'user', content: originalText },
      ],
      temperature: 0.1,
      max_tokens: 300,
    });

    let content = response.choices[0].message.content || '';
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch?.[1]) content = jsonMatch[1].trim();
    const first = content.indexOf('{');
    const last = content.lastIndexOf('}');
    if (first !== -1 && last > first) content = content.slice(first, last + 1);

    const parsed = translateSchema.parse(JSON.parse(content));
    return {
      originalText,
      englishCommand: parsed.englishCommand.trim(),
      detectedLanguage: parsed.detectedLanguage,
      detectedLanguageName: parsed.detectedLanguageName,
    };
  } catch {
    return {
      originalText,
      englishCommand: originalText,
      detectedLanguage: 'unknown',
      detectedLanguageName: 'Unknown',
    };
  }
};
