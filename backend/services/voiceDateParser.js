/** Natural-language date/time parsing for voice commands. */

const WEEKDAYS = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const DATE_SIGNAL =
  /\b(tomorrow|today|tonight|next\s+(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)|this\s+(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i;

const TIME_SIGNAL =
  /\b(at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?\b|\b(at\s+)?(noon|midnight)\b/i;

const SCHEDULE_SIGNAL =
  /\b(meeting|schedule|appointment|call with|remind(?:er)?|at\s+\d|tomorrow|tonight|next\s+\w+day|\d{1,2}\s*(?:am|pm))\b/i;

export const hasDateTimeSignals = (text) =>
  DATE_SIGNAL.test(text) || TIME_SIGNAL.test(text) || SCHEDULE_SIGNAL.test(text);

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const nextWeekday = (from, targetDay, allowToday = false) => {
  const base = startOfDay(from);
  const cur = base.getDay();
  let delta = (targetDay - cur + 7) % 7;
  if (delta === 0 && !allowToday) delta = 7;
  return addDays(base, delta);
};

const parseTime = (text, baseDate) => {
  const lower = text.toLowerCase();
  if (/\bnoon\b/.test(lower)) {
    const d = new Date(baseDate);
    d.setHours(12, 0, 0, 0);
    return d;
  }
  if (/\bmidnight\b/.test(lower)) {
    const d = new Date(baseDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const m = lower.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/);
  if (!m) return null;

  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3]?.replace(/\./g, '').toLowerCase();

  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (!meridiem && hour <= 6) hour += 12; // "at 3" → 3pm for voice UX

  const d = new Date(baseDate);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const parseDatePart = (text, refDate = new Date()) => {
  const lower = text.toLowerCase();

  if (/\byesterday\b/.test(lower)) {
    return { date: startOfDay(addDays(refDate, -1)), isPast: true };
  }

  const lastDay = lower.match(
    /\blast\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/
  );
  if (lastDay) {
    const day = WEEKDAYS[lastDay[1]];
    const base = startOfDay(refDate);
    const cur = base.getDay();
    let delta = (cur - day + 7) % 7;
    if (delta === 0) delta = 7;
    return { date: addDays(base, -delta), isPast: true };
  }

  if (/\btoday\b/.test(lower) || /\btonight\b/.test(lower)) {
    return { date: startOfDay(refDate), isPast: false };
  }

  if (/\btomorrow\b/.test(lower)) {
    return { date: startOfDay(addDays(refDate, 1)), isPast: false };
  }

  const nextDay = lower.match(
    /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/
  );
  if (nextDay) {
    const day = WEEKDAYS[nextDay[1]];
    return { date: nextWeekday(refDate, day, false), isPast: false };
  }

  const thisDay = lower.match(
    /\bthis\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/
  );
  if (thisDay) {
    const day = WEEKDAYS[thisDay[1]];
    return { date: nextWeekday(refDate, day, true), isPast: false };
  }

  const plainDay = lower.match(
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/
  );
  if (plainDay) {
    const day = WEEKDAYS[plainDay[1]];
    return { date: nextWeekday(refDate, day, true), isPast: false };
  }

  if (/\bthis week\b/.test(lower) || /\bnext week\b/.test(lower)) {
    return { date: startOfDay(refDate), isPast: false };
  }

  return { date: startOfDay(refDate), isPast: false };
};

/** Route task to Kanban column from scheduled datetime. */
export const categoryFromScheduledDate = (when, refDate = new Date()) => {
  if (!when) return 'today';
  const today = startOfDay(refDate);
  const target = startOfDay(when);

  if (target < today) return 'backlog';
  if (target.getTime() === today.getTime()) return 'today';
  return 'this_week';
};

export const categoryLabelFromDate = (when, refDate = new Date()) => {
  const cat = categoryFromScheduledDate(when, refDate);
  if (cat === 'this_week') return 'This Week';
  if (cat === 'backlog') return 'Backlog';
  return 'Today';
};

const STRIP_PATTERNS = [
  /\b(yesterday|tomorrow|today|tonight)\b/gi,
  /\blast\s+(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi,
  /\bnext\s+(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi,
  /\bthis\s+(?:week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi,
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi,
  /\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?\b/gi,
  /\b(?:at\s+)?(?:noon|midnight)\b/gi,
  /\bfor\b/gi,
  /\bon\b/gi,
];

export const cleanTitleFromSchedule = (title) => {
  let t = title;
  for (const re of STRIP_PATTERNS) t = t.replace(re, ' ');
  return t.replace(/\s+/g, ' ').trim();
};

export const formatSpokenDateTime = (date) => {
  if (!date) return '';
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const todayContext = () => {
  const now = new Date();
  return {
    isoDate: now.toISOString().split('T')[0],
    spoken: now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    now,
  };
};

/**
 * Parse schedule info from voice command fragment.
 * @returns {{ cleanTitle: string, isMeeting: boolean, meetingTime: Date|null, reminderAt: Date|null, category: string, spokenWhen: string } | null}
 */
export const parseVoiceSchedule = (text, refDate = new Date()) => {
  if (!text?.trim() || !hasDateTimeSignals(text)) return null;

  const { date: baseDate } = parseDatePart(text, refDate);
  const when = parseTime(text, baseDate);
  if (!when) return null;

  const category = categoryFromScheduledDate(when, refDate);

  let cleanTitle = cleanTitleFromSchedule(text);
  cleanTitle = cleanTitle
    .replace(/^(?:to|about|regarding)\s+/i, '')
    .replace(/^(?:a|an|the)\s+/i, '')
    .trim();

  if (cleanTitle.length < 2) cleanTitle = 'Scheduled task';

  const isMeeting =
    /\b(meeting|appointment|zoom|teams|standup|sync)\b/i.test(text) ||
    /\bcall\s+with\b/i.test(text);
  const cap = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

  return {
    cleanTitle: cap,
    isMeeting,
    meetingTime: isMeeting ? when : null,
    reminderAt: isMeeting ? null : when,
    category,
    spokenWhen: formatSpokenDateTime(when),
    categoryLabel: categoryLabelFromDate(when, refDate),
  };
};

export const toMongoDate = (val) => {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

export const mapVoiceTaskFields = (task, refDate = new Date()) => {
  const meetingTime = toMongoDate(task.meetingTime);
  const reminderAt = toMongoDate(task.reminderAt);
  const isMeeting = !!task.isMeeting || !!meetingTime;
  const scheduledWhen = meetingTime || reminderAt;
  const category = scheduledWhen
    ? categoryFromScheduledDate(scheduledWhen, refDate)
    : task.category || 'today';

  return {
    title: task.title,
    description: task.description || '',
    priority: task.priority || 'medium',
    category,
    tags: task.tags || [],
    estimatedMinutes: task.estimatedMinutes ?? null,
    isMeeting,
    meetingTime: isMeeting ? meetingTime : null,
    reminderAt: reminderAt || (!isMeeting && meetingTime ? meetingTime : null),
  };
};
