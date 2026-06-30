'use client';

import { useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { getSpeechRecognition, buildTranscript } from '@/lib/voice/recognition';
import { resolveRecognitionLang, getSpeechLangPreference } from '@/lib/voice/speechLang';
import { blobToBase64, captureUntilSilence } from '@/lib/voice/audioCapture';
import { isChromeEdge } from '@/lib/voice/wakeWordDetect';

export type SttStrategy = 'auto' | 'browser' | 'whisper';

export type CaptureCallbacks = {
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (msg: string) => void;
  onCapturing?: () => void;
};

function resolveStrategy(strategy: SttStrategy): 'browser' | 'whisper' {
  if (strategy === 'browser') return 'browser';
  if (strategy === 'whisper') return 'whisper';
  return isChromeEdge() && !!getSpeechRecognition() ? 'browser' : 'whisper';
}

export function useVoiceCapture() {
  const recRef = useRef<SpeechRecognition | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      try {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.abort();
      } catch {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  const transcribeWhisper = useCallback(async (languageHint?: string) => {
    const { blob, mimetype } = await captureUntilSilence();
    const audio = await blobToBase64(blob);
    const res = await api.voiceTranscribe(audio, mimetype, languageHint);
    return res.transcript;
  }, []);

  const listenOnceBrowser = useCallback(
    (callbacks: CaptureCallbacks, speechLang: string) =>
      new Promise<void>((resolve) => {
        const SR = getSpeechRecognition();
        if (!SR) {
          callbacks.onError?.('Browser speech not supported');
          resolve();
          return;
        }

        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = resolveRecognitionLang(speechLang);

        rec.onresult = (e) => {
          const { display, lastIsFinal } = buildTranscript(e);
          if (display) callbacks.onInterim?.(display);
          if (lastIsFinal && display.length >= 2) {
            callbacks.onFinal(display);
            try {
              rec.stop();
            } catch {
              /* ignore */
            }
          }
        };

        rec.onerror = (e: SpeechRecognitionErrorEvent) => {
          if (e.error !== 'aborted') callbacks.onError?.(e.error);
          resolve();
        };

        rec.onend = () => {
          recRef.current = null;
          resolve();
        };

        recRef.current = rec;
        try {
          rec.start();
        } catch {
          callbacks.onError?.('Could not start microphone');
          resolve();
        }
      }),
    []
  );

  const captureFinal = useCallback(
    async (strategy: SttStrategy, callbacks: CaptureCallbacks, speechLang = getSpeechLangPreference()) => {
      stop();
      const engine = resolveStrategy(strategy);

      if (engine === 'browser') {
        await listenOnceBrowser(callbacks, speechLang);
        return 'browser' as const;
      }

      callbacks.onCapturing?.();
      try {
        const transcript = await transcribeWhisper(
          speechLang !== 'auto' ? speechLang.split('-')[0] : undefined
        );
        if (transcript) callbacks.onFinal(transcript);
        else callbacks.onError?.('No speech detected');
        return 'whisper' as const;
      } catch (err) {
        callbacks.onError?.(err instanceof Error ? err.message : 'Transcription failed');
        return 'whisper' as const;
      }
    },
    [listenOnceBrowser, stop, transcribeWhisper]
  );

  return { captureFinal, stop, resolveStrategy };
}
