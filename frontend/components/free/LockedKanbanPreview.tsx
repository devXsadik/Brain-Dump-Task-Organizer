'use client';

import { KanbanBoard } from '@/components/dashboard/KanbanBoard';
import { Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';

const SAMPLE_TASKS = [
  { title: 'Fix login bug in production', category: 'today', priority: 'urgent' },
  { title: 'Prepare team standup notes', category: 'today', priority: 'high' },
  { title: 'Update API documentation', category: 'this_week', priority: 'medium' },
  { title: 'Research new analytics tool', category: 'backlog', priority: 'low' },
];

export function LockedKanbanPreview() {
  return (
    <div className="relative mt-8 rounded-xl overflow-hidden border border-border-default">
      <div className="absolute inset-0 z-10 backdrop-blur-sm bg-bg-primary/60 flex flex-col items-center justify-center p-6 text-center">
        <Lock className="w-10 h-10 text-accent mb-3" />
        <h3 className="text-lg font-bold text-text-primary">AI Kanban Preview</h3>
        <p className="text-sm text-text-secondary mt-2 max-w-sm">
          Upgrade to Plus to unlock the full 3-column Kanban board with AI-organized tasks.
        </p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex items-center gap-2 px-5 py-2 bg-accent text-white text-sm font-medium rounded-lg shadow-[0_0_15px_var(--accent-glow)]"
        >
          <Sparkles className="w-4 h-4" /> Upgrade to Plus — $6/mo
        </Link>
      </div>
      <div className="p-6 opacity-40 pointer-events-none select-none">
        <div className="grid grid-cols-3 gap-4">
          {['TODAY', 'THIS WEEK', 'BACKLOG'].map((col) => (
            <div key={col} className="bg-bg-card rounded-lg p-3 border border-border-default">
              <p className="text-xs font-bold text-text-tertiary mb-3">{col}</p>
              {SAMPLE_TASKS.filter((t) =>
                col === 'TODAY' ? t.category === 'today' : col === 'THIS WEEK' ? t.category === 'this_week' : t.category === 'backlog'
              ).map((t) => (
                <div key={t.title} className="mb-2 p-2 bg-bg-primary rounded text-xs text-text-secondary">
                  {t.title}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
