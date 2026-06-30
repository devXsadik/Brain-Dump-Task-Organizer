export const SPEECH_LANG_KEY = 'dumpVoiceLang';

export interface SpeechLanguageOption {
  code: string;
  label: string;
}

/** Browser speech recognition locales — user can speak in any of these */
export const SPEECH_LANGUAGES: SpeechLanguageOption[] = [
  { code: 'auto', label: 'Auto (browser)' },
  { code: 'en-US', label: 'English' },
  { code: 'bn-BD', label: 'Bengali' },
  { code: 'bn-IN', label: 'Bengali (India)' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'ur-PK', label: 'Urdu' },
  { code: 'ar-SA', label: 'Arabic' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'pt-BR', label: 'Portuguese' },
  { code: 'zh-CN', label: 'Chinese' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'ko-KR', label: 'Korean' },
  { code: 'tr-TR', label: 'Turkish' },
  { code: 'it-IT', label: 'Italian' },
  { code: 'ru-RU', label: 'Russian' },
  { code: 'nl-NL', label: 'Dutch' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'te-IN', label: 'Telugu' },
];

export function getSpeechLangCode(): string {
  if (typeof window === 'undefined') return 'en-US';
  const saved = localStorage.getItem(SPEECH_LANG_KEY);
  if (saved && saved !== 'auto') return saved;
  return navigator.language || 'en-US';
}

export function getSpeechLangPreference(): string {
  if (typeof window === 'undefined') return 'auto';
  return localStorage.getItem(SPEECH_LANG_KEY) || 'auto';
}

export function setSpeechLangPreference(code: string) {
  localStorage.setItem(SPEECH_LANG_KEY, code);
}

export function getSpeechLangLabel(code: string): string {
  return SPEECH_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}

export function resolveRecognitionLang(preference: string): string {
  if (preference === 'auto') return getSpeechLangCode();
  return preference;
}
