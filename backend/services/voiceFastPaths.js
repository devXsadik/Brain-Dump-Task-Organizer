import { v4 as uuidv4 } from 'uuid';
import Task from '../models/Task.js';
import { isAffirmative } from './voiceSession.js';
import {
  hasDateTimeSignals,
  parseVoiceSchedule,
  todayContext,
  formatSpokenDateTime,
  mapVoiceTaskFields,
  categoryFromScheduledDate,
} from './voiceDateParser.js';
import { polishVoiceTask, categoryLabel } from './voiceTaskFormatter.js';

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const findOpenTask = (tasks, ref, session = null) => {
  if (!ref) return null;
  const r = normalize(ref);

  if (/\b(it|that|this)\b/.test(r) && session?.lastTaskId) {
    return tasks.find((t) => String(t._id) === session.lastTaskId && !t.isCompleted) || null;
  }

  const byPosition = r.match(/first|top|number\s*1/);
  if (byPosition) return tasks.find((t) => t.category === 'today' && !t.isCompleted);

  const matches = tasks.filter(
    (t) => !t.isCompleted && normalize(t.title).includes(r)
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return { ambiguous: true, matches };
  return null;
};

const toClarificationOptions = (matches) =>
  matches.map((m) => ({ id: String(m._id), title: m.title }));

const formatTaskList = (tasks, label) => {
  const open = tasks.filter((t) => !t.isCompleted);
  if (open.length === 0) return `No open tasks in ${label}.`;
  const lines = open.slice(0, 5).map((t, i) => {
    const when = t.meetingTime ? ` at ${formatSpokenDateTime(new Date(t.meetingTime))}` : '';
    return `${i + 1}. ${t.title}${when}`;
  });
  const more = open.length > 5 ? ` and ${open.length - 5} more.` : '.';
  return `${label}: ${lines.join(', ')}${more}`;
};

const formatMeetingList = (tasks) => {
  const meetings = tasks
    .filter((t) => !t.isCompleted && t.isMeeting && t.meetingTime)
    .sort((a, b) => new Date(a.meetingTime) - new Date(b.meetingTime));
  if (meetings.length === 0) return 'No scheduled meetings.';
  return meetings
    .slice(0, 5)
    .map((t, i) => `${i + 1}. ${t.title} at ${formatSpokenDateTime(new Date(t.meetingTime))}`)
    .join('. ');
};

const createScheduledTask = async (userId, raw, scheduleText, sourceText) => {
  const parsed = parseVoiceSchedule(scheduleText);
  if (!parsed) return null;

  const polished = await polishVoiceTask(raw || scheduleText, {
    scheduledWhen: parsed.spokenWhen,
    isMeeting: parsed.isMeeting,
    forcedCategory: parsed.category,
  });

  const fields = mapVoiceTaskFields({
    title: polished.title || parsed.cleanTitle,
    description: polished.description,
    priority: polished.priority || (parsed.isMeeting ? 'high' : 'medium'),
    tags: polished.tags,
    category: parsed.category,
    isMeeting: parsed.isMeeting,
    meetingTime: parsed.meetingTime,
    reminderAt: parsed.reminderAt,
  });

  const inserted = await Task.create({
    userId,
    ...fields,
    sourceText: sourceText || raw,
    dumpBatchId: uuidv4(),
  });

  const col = parsed.categoryLabel || categoryLabel(parsed.category);
  const when = parsed.spokenWhen;
  const spokenReply = parsed.isMeeting
    ? `Scheduled "${inserted.title}" for ${when} in ${col}.`
    : `Added "${inserted.title}" in ${col}, reminder ${when}.`;

  return {
    spokenReply,
    needsConfirmation: false,
    needsClarification: false,
    actionsApplied: [{ type: 'create', count: 1 }],
    intent: 'create',
    createdIds: [inserted._id],
  };
};

const createPolishedTask = async (userId, raw, commandFragment, explicitCategory = null) => {
  const polished = await polishVoiceTask(commandFragment || raw, {
    forcedCategory: explicitCategory,
  });

  const category = explicitCategory || 'today';
  const inserted = await Task.create({
    userId,
    title: polished.title,
    description: polished.description,
    priority: polished.priority,
    tags: polished.tags,
    category,
    sourceText: raw,
    dumpBatchId: uuidv4(),
  });

  return {
    spokenReply: `Added "${inserted.title}" to ${categoryLabel(category)}.`,
    needsConfirmation: false,
    needsClarification: false,
    actionsApplied: [{ type: 'create', count: 1 }],
    intent: 'create',
    createdIds: [inserted._id],
  };
};

/**
 * Handle common voice commands without calling the AI — faster and more reliable.
 * Returns null if no fast path matches.
 */
export const tryVoiceFastPath = async (userId, transcript, tasks, confirmDelete = false, session = null) => {
  const raw = transcript.trim();
  const t = normalize(raw);
  if (!t) return null;

  if (confirmDelete || isAffirmative(raw)) {
    return null;
  }

  // ── Complete ──────────────────────────────────────────────
  if (t === 'done' || t === 'mark done' || t === 'all done') {
    const first = tasks.find((x) => x.category === 'today' && !x.isCompleted);
    if (!first) {
      return {
        spokenReply: 'No open tasks in Today to complete.',
        needsConfirmation: false,
        needsClarification: false,
        actionsApplied: [],
        intent: 'query',
      };
    }
    await Task.findOneAndUpdate(
      { _id: first._id, userId },
      { isCompleted: true, status: 'completed', completedAt: new Date() }
    );
    return {
      spokenReply: `Marked "${first.title}" as done.`,
      needsConfirmation: false,
      needsClarification: false,
      actionsApplied: [{ type: 'complete', taskId: first._id }],
      intent: 'complete',
    };
  }

  const completeMatch = t.match(/^(?:complete|mark|finish|check off)\s+(.+?)(?:\s+as\s+done)?$/);
  if (completeMatch) {
    const resolved = findOpenTask(tasks, completeMatch[1], session);
    if (resolved?.ambiguous) {
      return {
        spokenReply: `Which one? Say the number or name. ${resolved.matches.map((m, i) => `${i + 1}. ${m.title}`).join(', ')}`,
        needsConfirmation: false,
        needsClarification: true,
        clarificationOptions: toClarificationOptions(resolved.matches),
        clarificationAction: 'complete',
        actionsApplied: [],
        intent: 'complete',
      };
    }
    if (resolved?._id) {
      await Task.findOneAndUpdate(
        { _id: resolved._id, userId },
        { isCompleted: true, status: 'completed', completedAt: new Date() }
      );
      return {
        spokenReply: `Marked "${resolved.title}" as done.`,
        needsConfirmation: false,
        needsClarification: false,
        actionsApplied: [{ type: 'complete', taskId: resolved._id }],
        intent: 'complete',
      };
    }
    return {
      spokenReply: `I couldn't find a task matching "${completeMatch[1]}".`,
      needsConfirmation: false,
      needsClarification: false,
      actionsApplied: [],
      intent: 'query',
    };
  }

  // ── Date / time queries ──────────────────────────────────────────────
  if (/what.?s the date|what day is|today.?s date|what is today.?s date/.test(t)) {
    const { spoken } = todayContext();
    return {
      spokenReply: `Today is ${spoken}.`,
      needsConfirmation: false,
      needsClarification: false,
      actionsApplied: [],
      intent: 'query',
    };
  }

  if (/what meetings|my schedule|any meetings|meetings today|calendar today/.test(t)) {
    return {
      spokenReply: formatMeetingList(tasks),
      needsConfirmation: false,
      needsClarification: false,
      actionsApplied: [],
      intent: 'query',
    };
  }

  // ── Schedule / remind with dates ──────────────────────────────────────────────
  const scheduleMatch = t.match(
    /^(?:schedule|book|set up)\s+(?:a\s+)?(?:meeting|call|appointment)\s+(?:with\s+)?(.+)$/i
  );
  if (scheduleMatch && hasDateTimeSignals(scheduleMatch[1])) {
    const result = await createScheduledTask(userId, raw, scheduleMatch[1], raw);
    if (result) return result;
  }

  const remindMatch = t.match(/^remind me (?:to\s+)?(.+)$/i);
  if (remindMatch && hasDateTimeSignals(remindMatch[1])) {
    const result = await createScheduledTask(userId, raw, remindMatch[1], raw);
    if (result) return result;
  }

  const setReminderMatch = t.match(
    /^(?:set reminder|remind me about|schedule)\s+(.+?)\s+(?:for|on|at)\s+(.+)$/i
  );
  if (setReminderMatch) {
    const resolved = findOpenTask(tasks, setReminderMatch[1], session);
    const scheduleText = setReminderMatch[2];
    const parsed = parseVoiceSchedule(scheduleText);
    if (resolved?._id && parsed) {
      const category = categoryFromScheduledDate(parsed.reminderAt || parsed.meetingTime);
      await Task.findOneAndUpdate(
        { _id: resolved._id, userId },
        {
          reminderAt: parsed.reminderAt || parsed.meetingTime,
          isMeeting: parsed.isMeeting,
          meetingTime: parsed.isMeeting ? parsed.meetingTime : null,
          category,
        }
      );
      return {
        spokenReply: `Set reminder for "${resolved.title}" on ${parsed.spokenWhen} in ${parsed.categoryLabel || categoryLabel(category)}.`,
        needsConfirmation: false,
        needsClarification: false,
        actionsApplied: [{ type: 'update', taskId: resolved._id }],
        intent: 'update',
      };
    }
  }

  // ── Create ──────────────────────────────────────────────
  const addMatch = t.match(/^(?:add|create|new task|remind me to)\s+(.+)$/);
  if (addMatch) {
    const title = addMatch[1].trim();
    if (title.length < 2) return null;

    if (hasDateTimeSignals(title)) {
      const scheduled = await createScheduledTask(userId, raw, title, raw);
      if (scheduled) return scheduled;
      return null;
    }

    const category = t.includes('backlog')
      ? 'backlog'
      : t.includes('this week') || t.includes('week')
        ? 'this_week'
        : 'today';

    return createPolishedTask(userId, raw, title, category);
  }

  // ── Query ──────────────────────────────────────────────
  if (
    /what.?s on my plate|what do i have|list (my )?tasks|show (my )?tasks/.test(t)
  ) {
    const today = tasks.filter((x) => x.category === 'today' && !x.isCompleted);
    return {
      spokenReply: formatTaskList(today, 'Today'),
      needsConfirmation: false,
      needsClarification: false,
      actionsApplied: [],
      intent: 'query',
    };
  }

  if (/what.?s this week|show week/.test(t)) {
    const week = tasks.filter((x) => x.category === 'this_week' && !x.isCompleted);
    return {
      spokenReply: formatTaskList(week, 'This Week'),
      needsConfirmation: false,
      needsClarification: false,
      actionsApplied: [],
      intent: 'query',
    };
  }

  if (/how many tasks|task count/.test(t)) {
    const open = tasks.filter((x) => !x.isCompleted).length;
    return {
      spokenReply: `You have ${open} open task${open === 1 ? '' : 's'}.`,
      needsConfirmation: false,
      needsClarification: false,
      actionsApplied: [],
      intent: 'query',
    };
  }

  // ── Move / update category ──────────────────────────────
  const moveMatch = t.match(/^move\s+(.+?)\s+to\s+(today|this week|week|backlog)$/);
  if (moveMatch) {
    const resolved = findOpenTask(tasks, moveMatch[1], session);
    const dest =
      moveMatch[2] === 'week' || moveMatch[2] === 'this week' ? 'this_week' : moveMatch[2];
    if (resolved?.ambiguous) {
      return {
        spokenReply: `Which task? ${resolved.matches.map((m, i) => `${i + 1}. ${m.title}`).join(', ')}`,
        needsConfirmation: false,
        needsClarification: true,
        clarificationOptions: toClarificationOptions(resolved.matches),
        clarificationAction: 'move',
        moveDest: dest,
        actionsApplied: [],
        intent: 'update',
      };
    }
    if (resolved?._id) {
      await Task.findOneAndUpdate({ _id: resolved._id, userId }, { category: dest });
      return {
        spokenReply: `Moved "${resolved.title}" to ${dest.replace('_', ' ')}.`,
        needsConfirmation: false,
        needsClarification: false,
        actionsApplied: [{ type: 'update', taskId: resolved._id }],
        intent: 'update',
      };
    }
    return {
      spokenReply: `Couldn't find "${moveMatch[1]}" to move.`,
      needsConfirmation: false,
      needsClarification: false,
      actionsApplied: [],
      intent: 'query',
    };
  }

  // ── Delete (needs confirmation) ──────────────────────────────
  const deleteMatch = t.match(/^(?:delete|remove)\s+(.+)$/);
  if (deleteMatch) {
    const resolved = findOpenTask(tasks, deleteMatch[1], session);
    if (resolved?.ambiguous) {
      return {
        spokenReply: `Which task to delete? ${resolved.matches.map((m, i) => `${i + 1}. ${m.title}`).join(', ')}`,
        needsConfirmation: false,
        needsClarification: true,
        clarificationOptions: toClarificationOptions(resolved.matches),
        clarificationAction: 'delete',
        actionsApplied: [],
        intent: 'delete',
      };
    }
    if (!resolved?._id) {
      return {
        spokenReply: `Couldn't find "${deleteMatch[1]}" to delete.`,
        needsConfirmation: false,
        needsClarification: false,
        actionsApplied: [],
        intent: 'query',
      };
    }
    if (!confirmDelete) {
      return {
        spokenReply: `Delete "${resolved.title}"? Say confirm or tap Confirm.`,
        needsConfirmation: true,
        needsClarification: false,
        actionsApplied: [],
        intent: 'delete',
        pendingTranscript: raw,
        pendingTaskId: resolved._id,
      };
    }
    await Task.findOneAndDelete({ _id: resolved._id, userId });
    return {
      spokenReply: `Deleted "${resolved.title}".`,
      needsConfirmation: false,
      needsClarification: false,
      actionsApplied: [{ type: 'delete', taskId: resolved._id }],
      intent: 'delete',
    };
  }

  return null;
};

export const VOICE_COMMAND_CATALOG = [
  { phrase: 'add buy milk / দুধ কিনতে হবে', action: 'Any language → English task' },
  { phrase: 'add call dentist tomorrow at 3pm', action: 'Polished title → This Week + reminder' },
  { phrase: 'add fix bug yesterday', action: 'Past date → Backlog' },
  { phrase: 'schedule meeting with John Friday at 2pm', action: 'Meeting on calendar' },
  { phrase: "what's the date", action: 'Hear today\'s date' },
  { phrase: 'what meetings today', action: 'List scheduled meetings' },
  { phrase: 'add review slides to this week', action: 'Create task in This Week' },
  { phrase: 'done / হয়ে গেছে', action: 'Complete first Today task' },
  { phrase: 'complete dentist', action: 'Mark matching task done' },
  { phrase: "what's on my plate", action: 'List Today tasks' },
  { phrase: 'how many tasks', action: 'Count open tasks' },
  { phrase: 'move report to backlog', action: 'Change task column' },
  { phrase: 'set reminder for report tomorrow at 9am', action: 'Add reminder to existing task' },
  { phrase: 'delete old task', action: 'Delete (asks confirmation)' },
  { phrase: 'the first one / number 2', action: 'Clarify ambiguous match' },
  { phrase: 'confirm / হ্যাঁ', action: 'Confirm pending delete' },
];
