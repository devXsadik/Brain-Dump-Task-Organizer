'use client';

import { useState } from 'react';
import { Task } from '@/lib/types';
import { useTasks } from '@/context/TaskContext';
import { Check, Clock, Trash2, Calendar, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface TaskCardProps {
  task: Task;
  editable?: boolean;
}

export function TaskCard({ task, editable = false }: TaskCardProps) {
  const { toggleTask, deleteTask, fetchTasks } = useTasks();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return 'bg-priority-urgent/10 text-priority-urgent border-priority-urgent/20';
      case 'high': return 'bg-priority-high/10 text-priority-high border-priority-high/20';
      case 'medium': return 'bg-priority-medium/10 text-priority-medium border-priority-medium/20';
      case 'low': return 'bg-priority-low/10 text-priority-low border-priority-low/20';
      default: return 'bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20';
    }
  };

  const saveEdit = async () => {
    if (!editTitle.trim()) return;
    try {
      await api.updateTask(task._id, { title: editTitle.trim() });
      await fetchTasks();
      setEditing(false);
    } catch {
      toast.error('Failed to update task');
    }
  };

  const formatMeetingTime = (time: string) => {
    try {
      return new Date(time).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return time;
    }
  };

  return (
    <div
      className={cn(
        'group relative bg-bg-card rounded-xl p-5 border border-border-default hover:border-border-active transition-all duration-300 hover:shadow-xl hover:-translate-y-1',
        task.isCompleted ? 'opacity-50 grayscale-[50%]' : 'hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]'
      )}
    >
      <div className="flex items-start gap-4">
        <button
          onClick={() => toggleTask(task._id)}
          className={cn(
            'mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0',
            task.isCompleted ? 'bg-accent border-accent text-white' : 'border-text-tertiary hover:border-accent'
          )}
        >
          {task.isCompleted && <Check className="w-3.5 h-3.5" />}
        </button>

        <div className="flex-1 min-w-0 pr-8">
          {editing ? (
            <div className="flex gap-2">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 bg-bg-primary border border-border-default rounded px-2 py-1 text-sm text-text-primary"
                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              />
              <button onClick={saveEdit} className="text-xs text-accent font-medium">Save</button>
            </div>
          ) : (
            <h3 className={cn('text-base font-semibold text-text-primary leading-tight', task.isCompleted && 'line-through text-text-secondary')}>
              {task.title}
            </h3>
          )}

          {task.description && (
            <p className="mt-2 text-sm text-text-secondary line-clamp-2 leading-relaxed">{task.description}</p>
          )}

          {task.isMeeting && task.meetingTime && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-category-week bg-category-week/10 px-2.5 py-1 rounded-full border border-category-week/20 w-fit">
              <Calendar className="w-3.5 h-3.5" />
              {formatMeetingTime(task.meetingTime)}
            </div>
          )}

          {!task.isMeeting && task.reminderAt && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-accent bg-accent/10 px-2.5 py-1 rounded-full border border-accent/20 w-fit">
              <Clock className="w-3.5 h-3.5" />
              Reminder: {formatMeetingTime(task.reminderAt)}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider', getPriorityColor(task.priority))}>
              {task.priority}
            </div>
            {task.estimatedMinutes && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-tertiary bg-bg-secondary px-2.5 py-1 rounded-full border border-border-default">
                <Clock className="w-3 h-3" />
                {task.estimatedMinutes}m
              </div>
            )}
            {task.isRecurring && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-secondary text-text-tertiary border border-border-default">
                ↻ {task.recurrenceRule}
              </span>
            )}
          </div>

          {task.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {task.tags.map((tag) => (
                <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-md text-text-secondary bg-bg-primary border border-border-default/50">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
        {editable && !editing && (
          <button onClick={() => setEditing(true)} className="p-2 text-text-tertiary hover:text-accent rounded-lg hover:bg-accent/10" title="Edit">
            <Pencil className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => deleteTask(task._id)} className="p-2 text-text-tertiary hover:text-priority-urgent rounded-lg hover:bg-priority-urgent/10" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
