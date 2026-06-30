'use client';

import { cn } from '@/lib/utils';

interface VoiceWaveformProps {
  active?: boolean;
  className?: string;
}

export function VoiceWaveform({ active = false, className }: VoiceWaveformProps) {
  return (
    <div className={cn('flex items-end justify-center gap-1 h-8', className)}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn(
            'w-1 rounded-full bg-accent transition-all',
            active ? 'animate-voice-bar' : 'h-1 opacity-30'
          )}
          style={{
            animationDelay: active ? `${i * 0.12}s` : undefined,
            height: active ? undefined : '4px',
          }}
        />
      ))}
    </div>
  );
}
