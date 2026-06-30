'use client';

import { Archive, Calendar, Check, Clock, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

type PreviewTask = {
  title: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  minutes?: number;
  meeting?: string;
  done?: boolean;
};

type PreviewColumn = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
  tasks: PreviewTask[];
};

const columns: PreviewColumn[] = [
  {
    title: 'TODAY',
    icon: Sun,
    colorClass: 'text-category-today border-category-today',
    bgClass: 'bg-category-today/10',
    tasks: [
      { title: 'Fix production login bug', priority: 'urgent', minutes: 60 },
      { title: 'Team standup prep', priority: 'high', minutes: 15, meeting: 'Mon 9:00 AM' },
    ],
  },
  {
    title: 'THIS WEEK',
    icon: Calendar,
    colorClass: 'text-category-week border-category-week',
    bgClass: 'bg-category-week/10',
    tasks: [
      { title: 'Update API documentation', priority: 'medium', minutes: 120 },
      { title: 'Review Q2 roadmap', priority: 'medium', minutes: 45 },
    ],
  },
  {
    title: 'BACKLOG',
    icon: Archive,
    colorClass: 'text-category-backlog border-category-backlog',
    bgClass: 'bg-category-backlog/10',
    tasks: [
      { title: 'Research analytics tools', priority: 'low' },
      { title: 'Redesign onboarding flow', priority: 'low' },
    ],
  },
];

function priorityStyles(priority: PreviewTask['priority']) {
  switch (priority) {
    case 'urgent':
      return 'bg-priority-urgent/10 text-priority-urgent border-priority-urgent/20';
    case 'high':
      return 'bg-priority-high/10 text-priority-high border-priority-high/20';
    case 'medium':
      return 'bg-priority-medium/10 text-priority-medium border-priority-medium/20';
    case 'low':
      return 'bg-priority-low/10 text-priority-low border-priority-low/20';
  }
}

function PreviewTaskCard({ task }: { task: PreviewTask }) {
  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border-default shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
            task.done ? 'bg-accent border-accent' : 'border-text-tertiary/60'
          )}
        >
          {task.done && <Check className="w-3 h-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary leading-snug">{task.title}</p>
          {task.meeting && (
            <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-category-week bg-category-week/10 px-2 py-0.5 rounded-full border border-category-week/20">
              <Calendar className="w-3 h-3" />
              {task.meeting}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider',
                priorityStyles(task.priority)
              )}
            >
              {task.priority}
            </span>
            {task.minutes != null && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-text-tertiary bg-bg-secondary px-2 py-0.5 rounded-full border border-border-default">
                <Clock className="w-3 h-3" />
                {task.minutes}m
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewColumn({ column }: { column: PreviewColumn }) {
  const Icon = column.icon;
  return (
    <div className="flex flex-col bg-bg-card/50 backdrop-blur-md rounded-xl border border-border-default overflow-hidden shadow-lg min-h-[280px]">
      <div className={cn('flex items-center gap-2.5 px-3 py-3 border-b border-border-default/50', column.bgClass)}>
        <div className={cn('p-1.5 rounded-md bg-bg-primary shadow-sm border border-border-default/50', column.colorClass)}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-[11px] font-bold tracking-wider text-text-primary flex-1">{column.title}</h3>
        <span className="bg-bg-primary border border-border-default text-text-secondary text-[10px] px-2 py-0.5 rounded-full font-bold">
          {column.tasks.length}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-3 flex-1">
        {column.tasks.map((task) => (
          <PreviewTaskCard key={task.title} task={task} />
        ))}
      </div>
    </div>
  );
}

export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[720px]">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-border-active/40 via-border-default/20 to-transparent pointer-events-none" />
      <div className="relative rounded-2xl border border-border-default bg-bg-secondary/90 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* App chrome */}
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border-default bg-bg-primary/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-accent text-xs font-bold">BD</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">Dashboard</p>
              <p className="text-[10px] text-text-tertiary truncate">brain-dump.app</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
              Pro
            </span>
            <div className="w-7 h-7 rounded-full bg-bg-card border border-border-default flex items-center justify-center text-[10px] font-bold text-text-secondary">
              S
            </div>
          </div>
        </div>

        {/* Brain dump bar */}
        <div className="px-4 py-3 border-b border-border-default/60 bg-bg-card/40">
          <div className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-primary/60 px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse flex-shrink-0" />
            <p className="text-xs text-text-tertiary truncate">
              Dump your thoughts — meetings, todos, ideas…
            </p>
          </div>
        </div>

        {/* Kanban */}
        <div className="p-4 grid grid-cols-3 gap-3 bg-bg-primary/40">
          {columns.map((col) => (
            <PreviewColumn key={col.title} column={col} />
          ))}
        </div>
      </div>

      {/* Daily brief floating card */}
      <div className="absolute -bottom-4 -left-4 hidden lg:block w-52 rounded-xl border border-border-default bg-bg-card p-3 shadow-xl">
        <p className="text-[10px] font-bold uppercase tracking-wider text-accent mb-1.5">Daily brief</p>
        <p className="text-xs text-text-secondary leading-relaxed">
          Focus on the login bug first, then prep for standup at 9 AM.
        </p>
      </div>
    </div>
  );
}
