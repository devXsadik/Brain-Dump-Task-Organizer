'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function DailyBriefCard() {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState<{ brief: string; focusItems: string[] } | null>(null);
  const { refreshUsage } = useAuth();

  const generate = async () => {
    try {
      setLoading(true);
      const res = await api.dailyBrief();
      setBrief({ brief: res.brief, focusItems: res.focusItems });
      setOpen(true);
      await refreshUsage();
      toast.success('Daily brief ready');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate brief');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className={cn(
          'inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium border transition-colors',
          'border-border-default bg-bg-primary/50 text-text-secondary hover:text-text-primary hover:bg-bg-primary'
        )}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-accent" />}
        Daily Brief
      </button>

      {open && brief && (
        <div className="absolute right-0 top-full mt-2 z-30 w-80 p-4 bg-bg-card border border-border-default rounded-xl shadow-xl">
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Today&apos;s focus</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-bg-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-sm text-text-primary leading-relaxed">{brief.brief}</p>
          {brief.focusItems.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-border-default/60 pt-3">
              {brief.focusItems.map((item, i) => (
                <li key={i} className="text-xs text-text-secondary flex gap-2">
                  <span className="text-accent font-bold">{i + 1}.</span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
