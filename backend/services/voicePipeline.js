import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { z } from 'zod';
import Task from '../models/Task.js';
import { processRawDump } from './aiService.js';
import { VOICE_UNIFIED_PROMPT } from '../prompts/voiceUnifiedPrompt.js';
import { tryVoiceFastPath } from './voiceFastPaths.js';
import { translateVoiceToEnglish } from './voiceTranslateService.js';
import {
  getVoiceSession,
  clearPending,
  setLastTaskId,
  setPendingClarification,
  setPendingDelete,
  resolveClarificationChoice,
  isAffirmative,
} from './voiceSession.js';
import { hasDateTimeSignals, mapVoiceTaskFields, toMongoDate, categoryFromScheduledDate } from './voiceDateParser.js';
import { polishVoiceTask } from './voiceTaskFormatter.js';
import AppError from '../utils/AppError.js';

const actionSchema = z.object({
  detectedLanguage: z.string().optional(),
  detectedLanguageName: z.string().optional(),
  englishCommand: z.string().optional(),
  intent: z.enum(['create', 'update', 'complete', 'delete', 'query']),
  actions: z.array(z.record(z.unknown())).default([]),
  spokenReply: z.string().default('Done.'),
  needsConfirmation: z.boolean().default(false),
  needsClarification: z.boolean().default(false),
});

const groq = () =>
  new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });

const parseJsonContent = (content) => {
  let text = content || '';
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch?.[1]) text = jsonMatch[1].trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) text = text.slice(first, last + 1);
  return JSON.parse(text);
};

const callUnifiedAI = async (tasksJson, commandText, session) => {
  let ctx = '';
  if (session.lastTaskId) ctx += `lastTaskId: ${session.lastTaskId}\n`;
  if (session.clarificationOptions?.length) {
    ctx += `clarificationOptions: ${JSON.stringify(session.clarificationOptions)}\n`;
  }
  const response = await groq().chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: VOICE_UNIFIED_PROMPT(tasksJson, ctx) },
      { role: 'user', content: commandText },
    ],
    temperature: 0.2,
    max_tokens: 1500,
  });
  return actionSchema.parse(parseJsonContent(response.choices[0].message.content));
};

const resolveTask = (tasks, taskRef, session) => {
  if (!taskRef) return null;
  const ref = String(taskRef).toLowerCase();

  if (/\b(it|that|this)\b/.test(ref) && session.lastTaskId) {
    return tasks.find((t) => String(t._id) === session.lastTaskId) || null;
  }

  const positionMatch = ref.match(/first.*today|first one|number 1/);
  if (positionMatch) {
    return tasks.find((t) => t.category === 'today' && !t.isCompleted);
  }

  const matches = tasks.filter((t) => t.title.toLowerCase().includes(ref) && !t.isCompleted);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return { ambiguous: true, matches };
  return null;
};

const finalize = async (userId, partial) => {
  const finalTasks = await Task.find({ userId }).sort({ createdAt: -1 });
  return {
    ...partial,
    tasks: finalTasks,
    needsConfirmation: partial.needsConfirmation || false,
    needsClarification: partial.needsClarification || false,
  };
};

const withTranslationMeta = (translation, commandText, partial) => ({
  ...partial,
  originalTranscript: translation.originalText,
  translatedCommand: commandText,
  detectedLanguage: translation.detectedLanguage,
  detectedLanguageName: translation.detectedLanguageName,
});

const normalizeChanges = (changes = {}) => {
  const c = { ...changes };
  if (c.meetingTime !== undefined) {
    c.meetingTime = toMongoDate(c.meetingTime);
    if (c.meetingTime) c.isMeeting = true;
  }
  if (c.reminderAt !== undefined) c.reminderAt = toMongoDate(c.reminderAt);
  const scheduled = c.meetingTime || c.reminderAt;
  if (scheduled) c.category = categoryFromScheduledDate(scheduled);
  return c;
};

const buildCreatePayloads = async (transcript, commandText, aiTasks) => {
  const aiHasDates = aiTasks.some((t) => t.meetingTime || t.reminderAt || t.isMeeting);

  if (aiHasDates) {
    const results = [];
    for (const t of aiTasks) {
      const polished = await polishVoiceTask(t.title || commandText, {
        scheduledWhen: t.meetingTime || t.reminderAt,
        isMeeting: t.isMeeting,
      });
      results.push(
        mapVoiceTaskFields({
          ...t,
          title: polished.title || t.title,
          description: polished.description || t.description || '',
          priority: polished.priority || t.priority,
          tags: polished.tags?.length ? polished.tags : t.tags,
        })
      );
    }
    return results;
  }

  if (hasDateTimeSignals(commandText)) {
    const dumped = await processRawDump(commandText);
    const results = [];
    for (const t of dumped) {
      const polished = await polishVoiceTask(commandText, {
        scheduledWhen: t.meetingTime,
        isMeeting: t.isMeeting,
      });
      results.push(
        mapVoiceTaskFields({
          ...t,
          title: polished.title || t.title,
          description: polished.description || t.description || '',
          priority: polished.priority || t.priority,
          tags: polished.tags?.length ? polished.tags : t.tags,
        })
      );
    }
    return results;
  }

  const polished = await polishVoiceTask(commandText);
  if (aiTasks.length === 1 && aiTasks[0].title) {
    return [
      mapVoiceTaskFields({
        title: polished.title,
        description: polished.description,
        priority: polished.priority,
        tags: polished.tags,
        category: aiTasks[0].category || 'today',
      }),
    ];
  }

  const dumped = await processRawDump(commandText);
  const results = [];
  for (const t of dumped) {
    const p = await polishVoiceTask(t.title || commandText);
    results.push(
      mapVoiceTaskFields({
        ...t,
        title: p.title || t.title,
        description: p.description || t.description || '',
        priority: p.priority || t.priority,
        tags: p.tags?.length ? p.tags : t.tags,
      })
    );
  }
  return results.length ? results : [mapVoiceTaskFields({ ...polished, category: 'today' })];
};

const applyActions = async (userId, transcript, commandText, tasks, parsed, confirmDelete) => {
  const session = getVoiceSession(userId);
  const actionsApplied = [];
  let updatedTasks = [...tasks];

  for (const action of parsed.actions) {
    if (action.type === 'create' && action.tasks) {
      const payloads = await buildCreatePayloads(transcript, commandText, action.tasks);

      const batchId = uuidv4();
      const inserted = await Task.insertMany(
        payloads.map((t) => ({
          ...t,
          userId,
          sourceText: transcript,
          dumpBatchId: batchId,
        }))
      );
      updatedTasks = [...inserted, ...updatedTasks];
      actionsApplied.push({ type: 'create', count: inserted.length });
      if (inserted[0]) setLastTaskId(userId, inserted[0]._id);
    }

    if (action.type === 'update' && action.taskRef) {
      const resolved = resolveTask(updatedTasks, action.taskRef, session);
      if (resolved?.ambiguous) {
        setPendingClarification(userId, resolved.matches, 'update', { changes: action.changes });
        return {
          spokenReply: `Which task? ${resolved.matches.map((m, i) => `${i + 1}. ${m.title}`).join(', ')}`,
          needsClarification: true,
          clarificationOptions: getVoiceSession(userId).clarificationOptions,
          actionsApplied: [],
          intent: 'update',
        };
      }
      if (!resolved?._id) continue;
      const updated = await Task.findOneAndUpdate(
        { _id: resolved._id, userId },
        { $set: normalizeChanges(action.changes || {}) },
        { new: true }
      );
      if (updated) {
        setLastTaskId(userId, updated._id);
        actionsApplied.push({ type: 'update', taskId: updated._id });
      }
    }

    if (action.type === 'complete' && action.taskRef) {
      const resolved = resolveTask(updatedTasks, action.taskRef, session);
      if (resolved?.ambiguous) {
        setPendingClarification(userId, resolved.matches, 'complete');
        return {
          spokenReply: `Which one? ${resolved.matches.map((m, i) => `${i + 1}. ${m.title}`).join(', ')}`,
          needsClarification: true,
          clarificationOptions: getVoiceSession(userId).clarificationOptions,
          actionsApplied: [],
          intent: 'complete',
        };
      }
      if (!resolved?._id) continue;
      const updated = await Task.findOneAndUpdate(
        { _id: resolved._id, userId },
        { isCompleted: true, status: 'completed', completedAt: new Date() },
        { new: true }
      );
      if (updated) {
        setLastTaskId(userId, updated._id);
        actionsApplied.push({ type: 'complete', taskId: updated._id });
      }
    }

    if (action.type === 'delete' && action.taskRef) {
      const resolved = resolveTask(updatedTasks, action.taskRef, session);
      if (resolved?.ambiguous) {
        setPendingClarification(userId, resolved.matches, 'delete');
        return {
          spokenReply: `Which task to delete? ${resolved.matches.map((m, i) => `${i + 1}. ${m.title}`).join(', ')}`,
          needsClarification: true,
          clarificationOptions: getVoiceSession(userId).clarificationOptions,
          actionsApplied: [],
          intent: 'delete',
        };
      }
      if (!resolved?._id) continue;
      if (!confirmDelete) {
        setPendingDelete(userId, resolved._id, transcript);
        return {
          spokenReply: `Delete "${resolved.title}"? Say confirm to proceed.`,
          needsConfirmation: true,
          actionsApplied: [],
          pendingTranscript: transcript,
          intent: 'delete',
        };
      }
      await Task.findOneAndDelete({ _id: resolved._id, userId });
      actionsApplied.push({ type: 'delete', taskId: resolved._id });
      clearPending(userId);
    }
  }

  clearPending(userId);
  return {
    spokenReply: parsed.spokenReply,
    needsConfirmation: false,
    needsClarification: false,
    actionsApplied,
    intent: parsed.intent,
  };
};

export const runVoicePipeline = async (userId, transcript, tasks, confirmDelete = false) => {
  const session = getVoiceSession(userId);
  const startMs = Date.now();

  const translation = await translateVoiceToEnglish(transcript);
  let commandText = translation.englishCommand || transcript.trim();

  if (session.pendingAction?.type === 'delete' && (confirmDelete || isAffirmative(commandText))) {
    const task = await Task.findOne({ _id: session.pendingAction.taskId, userId });
    if (task) {
      await Task.findOneAndDelete({ _id: task._id, userId });
      clearPending(userId);
      return finalize(userId, withTranslationMeta(translation, 'confirm delete', {
        spokenReply: `Deleted "${task.title}".`,
        actionsApplied: [{ type: 'delete', taskId: task._id }],
        intent: 'delete',
        latencyMs: Date.now() - startMs,
      }));
    }
    clearPending(userId);
  }

  if (session.pendingClarification && session.clarificationOptions.length) {
    const choiceId = resolveClarificationChoice(userId, commandText);
    if (choiceId) {
      const { actionType, payload } = session.pendingClarification;
      const task = tasks.find((t) => String(t._id) === choiceId);
      clearPending(userId);

      if (actionType === 'complete' && task) {
        await Task.findOneAndUpdate(
          { _id: task._id, userId },
          { isCompleted: true, status: 'completed', completedAt: new Date() }
        );
        setLastTaskId(userId, task._id);
        return finalize(userId, withTranslationMeta(translation, commandText, {
          spokenReply: `Marked "${task.title}" as done.`,
          actionsApplied: [{ type: 'complete', taskId: task._id }],
          intent: 'complete',
          latencyMs: Date.now() - startMs,
        }));
      }

      if (actionType === 'delete' && task) {
        setPendingDelete(userId, choiceId, transcript);
        return finalize(userId, withTranslationMeta(translation, commandText, {
          spokenReply: `Delete "${task.title}"? Say confirm.`,
          needsConfirmation: true,
          pendingTranscript: transcript,
          intent: 'delete',
          latencyMs: Date.now() - startMs,
        }));
      }

      if (actionType === 'move' && task) {
        const dest = payload.dest || 'today';
        await Task.findOneAndUpdate({ _id: task._id, userId }, { category: dest });
        setLastTaskId(userId, task._id);
        return finalize(userId, withTranslationMeta(translation, commandText, {
          spokenReply: `Moved "${task.title}" to ${dest.replace('_', ' ')}.`,
          actionsApplied: [{ type: 'update', taskId: task._id }],
          intent: 'update',
          latencyMs: Date.now() - startMs,
        }));
      }

      if (actionType === 'update' && task && payload.changes) {
        await Task.findOneAndUpdate({ _id: task._id, userId }, { $set: normalizeChanges(payload.changes) });
        setLastTaskId(userId, task._id);
        return finalize(userId, withTranslationMeta(translation, commandText, {
          spokenReply: `Updated "${task.title}".`,
          actionsApplied: [{ type: 'update', taskId: task._id }],
          intent: 'update',
          latencyMs: Date.now() - startMs,
        }));
      }
    }
  }

  const fast = await tryVoiceFastPath(userId, commandText, tasks, confirmDelete, session);
  if (fast) {
    if (fast.actionsApplied?.[0]?.taskId) setLastTaskId(userId, fast.actionsApplied[0].taskId);
    if (fast.createdIds?.[0]) setLastTaskId(userId, fast.createdIds[0]);
    if (fast.needsClarification && fast.clarificationOptions) {
      setPendingClarification(
        userId,
        fast.clarificationOptions.map((o) => ({ _id: o.id, title: o.title })),
        fast.clarificationAction || 'complete',
        fast.moveDest ? { dest: fast.moveDest } : {}
      );
    }
    if (fast.needsConfirmation && fast.intent === 'delete') {
      const taskId = fast.pendingTaskId;
      if (taskId) setPendingDelete(userId, taskId, transcript);
    }
    return finalize(userId, {
      ...withTranslationMeta(translation, commandText, fast),
      latencyMs: Date.now() - startMs,
    });
  }

  const tasksJson = JSON.stringify(
    tasks.map((t) => ({
      id: t._id,
      title: t.title,
      category: t.category,
      priority: t.priority,
      isCompleted: t.isCompleted,
      isMeeting: t.isMeeting,
      meetingTime: t.meetingTime,
      reminderAt: t.reminderAt,
    }))
  );

  let parsed;
  try {
    parsed = await callUnifiedAI(tasksJson, commandText, session);
  } catch {
    throw new AppError(502, 'Could not understand voice command. Please try again.');
  }

  if (parsed.needsClarification) {
    return finalize(userId, withTranslationMeta(translation, commandText, {
      spokenReply: parsed.spokenReply,
      needsClarification: true,
      clarificationOptions: session.clarificationOptions,
      actionsApplied: [],
      intent: parsed.intent,
      latencyMs: Date.now() - startMs,
    }));
  }

  if (parsed.needsConfirmation && !confirmDelete) {
    return finalize(userId, withTranslationMeta(translation, commandText, {
      spokenReply: parsed.spokenReply || 'Please confirm to proceed.',
      needsConfirmation: true,
      actionsApplied: [],
      pendingTranscript: transcript,
      intent: parsed.intent,
      latencyMs: Date.now() - startMs,
    }));
  }

  const result = await applyActions(userId, transcript, commandText, tasks, parsed, confirmDelete);
  return finalize(userId, {
    ...withTranslationMeta(translation, commandText, result),
    latencyMs: Date.now() - startMs,
  });
};
