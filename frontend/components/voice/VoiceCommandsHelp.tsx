'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { VoiceCommandItem } from '@/lib/types';
import { HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const FALLBACK_COMMANDS: VoiceCommandItem[] = [
  { phrase: 'add buy milk / দুধ কিনতে হবে', action: 'Any language → English task' },
  { phrase: 'done / হয়ে গেছে', action: 'Complete first Today task' },
  { phrase: 'complete dentist', action: 'Mark matching task done' },
  { phrase: "what's on my plate", action: 'List Today tasks' },
  { phrase: 'move report to backlog', action: 'Change task column' },
  { phrase: 'delete old task', action: 'Delete (asks confirmation)' },
];

interface VoiceCommandsHelpProps {
  open: boolean;
  onClose: () => void;
}

export function VoiceCommandsHelp({ open, onClose }: VoiceCommandsHelpProps) {
  const [commands, setCommands] = useState<VoiceCommandItem[]>(FALLBACK_COMMANDS);
  const [tips, setTips] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    api
      .getVoiceCommands()
      .then((res) => {
        setCommands(res.commands);
        setTips(res.tips);
      })
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-text-primary">Voice commands</h3>
          </div>
          <button type="button" onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {commands.map((c) => (
            <div
              key={c.phrase}
              className="flex flex-col gap-0.5 rounded-lg bg-bg-primary px-3 py-2"
            >
              <p className="text-xs font-medium text-accent">&ldquo;{c.phrase}&rdquo;</p>
              <p className="text-[11px] text-text-tertiary">{c.action}</p>
            </div>
          ))}
          {tips.length > 0 && (
            <ul className="pt-2 space-y-1">
              {tips.map((t) => (
                <li key={t} className="text-[10px] text-text-tertiary">
                  · {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function VoiceCommandsHelpButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'text-[10px] text-accent hover:text-accent-hover font-medium inline-flex items-center gap-1',
          className
        )}
      >
        <HelpCircle className="w-3 h-3" />
        Voice commands
      </button>
      <VoiceCommandsHelp open={open} onClose={() => setOpen(false)} />
    </>
  );
}
