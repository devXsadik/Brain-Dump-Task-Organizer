const WAKE_RE = /\b(hey|hi|hy|ok)\s+(brain\s+)?(dump|dumb|dom|done|don|thump)\b/i;

export function normalizeSpeech(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Strip optional "Hey Dump" prefix — wake word is never required */
export function parseVoiceCommand(text: string) {
  const n = normalizeSpeech(text);
  const m = n.match(WAKE_RE);
  if (m && m.index !== undefined) {
    const after = n.slice(m.index + m[0].length).trim();
    if (after.length > 0) return after;
  }
  return n;
}

export function isCommandLike(text: string) {
  return text.trim().length >= 2;
}
