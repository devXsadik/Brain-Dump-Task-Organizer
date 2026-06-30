const LANG_MAP: Record<string, string> = {
  en: 'en-US',
  bn: 'bn-BD',
  hi: 'hi-IN',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ar: 'ar-SA',
  ja: 'ja-JP',
  zh: 'zh-CN',
};

function pickVoice(langPrefix: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.startsWith(langPrefix) && v.localService) ||
    voices.find((v) => v.lang.startsWith(langPrefix)) ||
    voices.find((v) => v.lang.startsWith('en'))
  );
}

export function speakText(text: string, replyLanguage: 'en' | 'auto' = 'en', detectedLang?: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    const langPrefix =
      replyLanguage === 'auto' && detectedLang && detectedLang !== 'en'
        ? detectedLang.split('-')[0]
        : 'en';
    const voice = pickVoice(LANG_MAP[langPrefix]?.split('-')[0] || langPrefix);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
