'use client';

import { Mic, MicOff } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { getSpeechLangPreference } from '@/lib/voice/speechLang';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export function VoiceInputButton({ onTranscript, className }: VoiceInputButtonProps) {
  const [listening, setListening] = useState(false);
  const { captureFinal, stop } = useVoiceCapture();

  const handleClick = useCallback(async () => {
    if (listening) {
      stop();
      setListening(false);
      return;
    }

    setListening(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      toast.error('Allow microphone access to use voice input');
      setListening(false);
      return;
    }

    await captureFinal('auto', {
      onInterim: () => {},
      onFinal: (text) => {
        onTranscript(text);
        setListening(false);
      },
      onError: (msg) => {
        toast.error(msg);
        setListening(false);
      },
      onCapturing: () => setListening(true),
    }, getSpeechLangPreference());
    setListening(false);
  }, [captureFinal, listening, onTranscript, stop]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border transition-colors',
        listening
          ? 'border-accent bg-accent/15 text-accent animate-pulse'
          : 'border-border-default text-text-secondary hover:text-accent hover:border-accent/30',
        className
      )}
    >
      {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
      {listening ? 'Listening…' : 'Speak'}
    </button>
  );
}
