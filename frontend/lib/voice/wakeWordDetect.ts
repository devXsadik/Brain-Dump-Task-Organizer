import { parseVoiceCommand } from './wakeWord';

const WAKE_VARIANTS = /\b(hey|hi|hy|ok)\s+(brain\s+)?(dump|dumb|dom|done|don|thump)\b/i;

export type WakeWordResult =
  | { activated: true; command: string }
  | { activated: false; command: string };

/** In hey_dump mode, only process after wake word on final transcript. */
export function detectWakeWord(transcript: string, mode: 'always' | 'hey_dump' | 'manual'): WakeWordResult {
  const trimmed = transcript.trim();
  if (!trimmed) return { activated: false, command: '' };

  if (mode === 'always' || mode === 'manual') {
    const cmd = parseVoiceCommand(trimmed);
    return { activated: true, command: cmd || trimmed };
  }

  const lower = trimmed.toLowerCase();
  const match = lower.match(WAKE_VARIANTS);
  if (!match || match.index === undefined) {
    return { activated: false, command: '' };
  }

  const after = trimmed.slice(match.index + match[0].length).trim();
  if (after.length < 2) {
    return { activated: false, command: '' };
  }

  return { activated: true, command: parseVoiceCommand(after) || after };
}

export function isChromeEdge(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isEdge = /Edg\//.test(ua);
  const isChrome = /Chrome\//.test(ua) && !/OPR|Opera/.test(ua);
  return isEdge || isChrome;
}
