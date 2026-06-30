'use client';

import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function UpgradeBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative mb-8 p-[1px] rounded-xl bg-gradient-to-r from-accent via-category-week to-accent overflow-hidden animate-fade-in">
      <div className="bg-bg-secondary rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary text-sm">Unlock AI-powered task organization</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Plus $6/mo — Kanban & AI dumps. Pro $8/mo — voice control & calendar sync.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/pricing"
            className="px-5 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-all shadow-[0_0_15px_var(--accent-glow)]"
          >
            Upgrade to Premium
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="text-text-tertiary hover:text-text-secondary text-xs transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
