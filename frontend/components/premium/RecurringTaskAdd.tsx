'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useTasks } from '@/context/TaskContext';
import { ChevronDown, Plus, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function RecurringTaskAdd() {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [rule, setRule] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const { fetchTasks } = useTasks();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.addTask(title.trim(), { isRecurring: true, recurrenceRule: rule });
      setTitle('');
      await fetchTasks();
      toast.success('Recurring task added');
    } catch {
      toast.error('Failed to add recurring task');
    }
  };

  return (
    <div className="rounded-xl border border-border-default bg-bg-card/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-bg-card/60 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-text-secondary">
          <Repeat className="w-4 h-4 text-accent" />
          Recurring tasks
        </span>
        <ChevronDown className={cn('w-4 h-4 text-text-tertiary transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <form onSubmit={handleAdd} className="px-4 pb-4 pt-1 border-t border-border-default/60 flex flex-wrap gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="flex-1 min-w-[180px] h-9 bg-bg-primary border border-border-default rounded-lg px-3 text-sm text-text-primary placeholder:text-text-tertiary"
          />
          <select
            value={rule}
            onChange={(e) => setRule(e.target.value as 'daily' | 'weekly' | 'monthly')}
            className="h-9 bg-bg-primary border border-border-default rounded-lg px-3 text-sm text-text-primary"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
      )}
    </div>
  );
}
