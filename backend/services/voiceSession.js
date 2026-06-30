/** In-memory voice session per user (resets on server restart). */

const sessions = new Map();

const emptySession = () => ({
  lastTaskId: null,
  pendingAction: null,
  pendingClarification: null,
  clarificationOptions: [],
});

export const getVoiceSession = (userId) => {
  const key = String(userId);
  if (!sessions.has(key)) sessions.set(key, emptySession());
  return sessions.get(key);
};

export const clearVoiceSession = (userId) => {
  sessions.delete(String(userId));
};

export const setPendingDelete = (userId, taskId, transcript) => {
  const s = getVoiceSession(userId);
  s.pendingAction = { type: 'delete', taskId, transcript };
};

export const setPendingClarification = (userId, options, actionType, payload = {}) => {
  const s = getVoiceSession(userId);
  s.pendingClarification = { actionType, payload };
  s.clarificationOptions = options.map((t, i) => ({
    id: String(t._id),
    title: t.title,
    index: i + 1,
  }));
};

export const clearPending = (userId) => {
  const s = getVoiceSession(userId);
  s.pendingAction = null;
  s.pendingClarification = null;
  s.clarificationOptions = [];
};

export const setLastTaskId = (userId, taskId) => {
  if (taskId) getVoiceSession(userId).lastTaskId = String(taskId);
};

export const resolveClarificationChoice = (userId, transcript) => {
  const s = getVoiceSession(userId);
  if (!s.clarificationOptions?.length) return null;

  const t = transcript.trim().toLowerCase();
  const numMatch = t.match(/^(?:number\s+)?(\d+)$|^(?:the\s+)?(first|second|third|1st|2nd|3rd)$/);
  if (numMatch) {
    let idx = numMatch[1] ? parseInt(numMatch[1], 10) : null;
    if (!idx && numMatch[2]) {
      const words = { first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3 };
      idx = words[numMatch[2]];
    }
    if (idx >= 1 && idx <= s.clarificationOptions.length) {
      return s.clarificationOptions[idx - 1].id;
    }
  }

  const byName = s.clarificationOptions.find((o) =>
    t.includes(o.title.toLowerCase()) || o.title.toLowerCase().includes(t)
  );
  return byName?.id ?? null;
};

const AFFIRMATIVE =
  /^(confirm|yes|yeah|yep|ok|okay|haan|ha|ji|theek|হ্যাঁ|ঠিক|نعم|oui|sí|si|ja|da|delete it|do it)$/i;

export const isAffirmative = (text) => AFFIRMATIVE.test(text.trim());
