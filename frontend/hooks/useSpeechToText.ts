'use client';

import { useCallback, useRef, useState } from 'react';
import { getSpeechRecognition } from '@/lib/voice/recognition';
import { resolveRecognitionLang, getSpeechLangPreference } from '@/lib/voice/speechLang';
import { toast } from 'sonner';

interface UseSpeechToTextOptions {
  onResult: (text: string) => void;
}

export function useSpeechToText({ onResult }: UseSpeechToTextOptions) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);

  const stop = useCallback(() => {
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      try {
        rec.abort();
      } catch {
        rec.stop();
      }
    }
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    const SR = getSpeechRecognition();
    if (!SR) {
      toast.error('Voice input needs Chrome or Edge');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      toast.error('Allow microphone access to use voice input');
      return;
    }

    stop();
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = resolveRecognitionLang(getSpeechLangPreference());

    let heard = '';

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        heard += e.results[i][0].transcript;
      }
    };

    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      const text = heard.trim();
      if (text) onResult(text);
      else toast.info('No speech detected');
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== 'aborted') toast.error('Could not hear you — try again');
      recRef.current = null;
      setListening(false);
    };

    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      toast.error('Could not start microphone');
    }
  }, [onResult, stop]);

  return { listening, start, stop };
}
