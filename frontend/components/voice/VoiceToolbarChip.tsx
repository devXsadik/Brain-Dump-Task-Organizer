'use client';

import { Brain, Mic } from 'lucide-react';
import { useOptionalVoiceAssistant } from '@/context/VoiceAssistantContext';
import { cn } from '@/lib/utils';

export function VoiceToolbarChip() {
  const voice = useOptionalVoiceAssistant();
  if (!voice) return null;

  const { phase, isActive, activate, deactivate, isSupported } = voice;
  if (!isSupported) return null;

  const label =
    phase === 'processing'
      ? 'Processing…'
      : phase === 'speaking'
        ? 'Speaking…'
        : isActive
          ? 'Voice on — speak now'
          : 'Enable voice';

  return (
    <button
      type="button"
      onClick={isActive ? deactivate : activate}
      className={cn(
        'inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium border transition-colors',
        isActive
          ? 'border-accent/30 bg-accent/10 text-accent'
          : 'border-border-default bg-bg-primary/50 text-text-secondary hover:text-text-primary'
      )}
    >
      {isActive ? (
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
      <Brain className="w-4 h-4 opacity-70" />
      {label}
    </button>
  );
}
