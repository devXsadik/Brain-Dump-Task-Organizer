'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { CheckCircle2, Flame, ListTodo, TrendingUp } from 'lucide-react';

export function AnalyticsPanel() {
  const [data, setData] = useState<{
    totalTasks: number;
    completedThisWeek: number;
    completionRate: number;
    pendingTasks: number;
    byCategory: { today: number; this_week: number; backlog: number };
    streak: number;
  } | null>(null);

  useEffect(() => {
    api.getAnalytics().then((res) => setData(res.analytics)).catch(() => {});
  }, []);

  const stats = data
    ? [
        { label: 'Completed this week', value: data.completedThisWeek, icon: CheckCircle2 },
        { label: 'Completion rate', value: `${data.completionRate}%`, icon: TrendingUp },
        { label: 'Pending tasks', value: data.pendingTasks, icon: ListTodo },
        { label: 'Active streak', value: `${data.streak}d`, icon: Flame },
      ]
    : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {(stats ?? Array.from({ length: 4 })).map((stat, i) => (
        <div
          key={stat?.label ?? i}
          className="rounded-xl border border-border-default bg-bg-card/60 p-4"
        >
          {stat ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                  {stat.label}
                </p>
                <stat.icon className="w-4 h-4 text-text-tertiary/70" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-text-primary tabular-nums">{stat.value}</p>
            </>
          ) : (
            <div className="animate-pulse space-y-3">
              <div className="h-3 w-24 bg-bg-secondary rounded" />
              <div className="h-7 w-12 bg-bg-secondary rounded" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
