'use client';

import { useTasks } from '@/context/TaskContext';
import { Sun, Calendar, Archive } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { motion } from 'framer-motion';
import { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface KanbanBoardProps {
  editable?: boolean;
}

export function KanbanBoard({ editable = false }: KanbanBoardProps) {
  const { todayTasks, weekTasks, backlogTasks, loading, fetchTasks } = useTasks();

  const handleDrop = async (taskId: string, newCategory: Task['category']) => {
    if (!editable) return;
    try {
      await api.updateTask(taskId, { category: newCategory });
      await fetchTasks();
    } catch {
      toast.error('Failed to move task');
    }
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-20">
        <div className="text-text-secondary animate-pulse font-medium">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
      <Column title="TODAY" icon={Sun} tasks={todayTasks} category="today" colorClass="text-category-today border-category-today" bgClass="bg-category-today/10" editable={editable} onDrop={handleDrop} />
      <Column title="THIS WEEK" icon={Calendar} tasks={weekTasks} category="this_week" colorClass="text-category-week border-category-week" bgClass="bg-category-week/10" editable={editable} onDrop={handleDrop} />
      <Column title="BACKLOG" icon={Archive} tasks={backlogTasks} category="backlog" colorClass="text-category-backlog border-category-backlog" bgClass="bg-category-backlog/10" editable={editable} onDrop={handleDrop} />
    </div>
  );
}

interface ColumnProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tasks: Task[];
  category: Task['category'];
  colorClass: string;
  bgClass: string;
  editable: boolean;
  onDrop: (taskId: string, category: Task['category']) => void;
}

function Column({ title, icon: Icon, tasks, category, colorClass, bgClass, editable, onDrop }: ColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    if (editable) e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) onDrop(taskId, category);
  };

  return (
    <div
      className="flex flex-col bg-bg-card/50 backdrop-blur-md rounded-2xl border border-border-default overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:border-border-active/50"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={cn('flex items-center gap-3 p-4 border-b border-border-default/50', bgClass)}>
        <div className={cn('p-2 rounded-lg bg-bg-primary shadow-sm', colorClass)}>
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="font-bold text-sm tracking-wider text-text-primary flex-1">{title}</h2>
        <span className="bg-bg-primary border border-border-default text-text-secondary text-xs px-2.5 py-1 rounded-full font-bold shadow-inner">
          {tasks.length}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4 min-h-[400px]">
        {tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
            <div className="w-20 h-20 mb-4 rounded-full bg-bg-secondary border border-border-default/50 flex items-center justify-center shadow-inner">
              <Icon className="w-10 h-10 text-text-tertiary/50" />
            </div>
            <p className="text-text-secondary font-medium mb-1">No tasks here</p>
            <p className="text-text-tertiary text-xs">Drop tasks here or add via brain dump.</p>
          </div>
        ) : (
          tasks.map((task, idx) => (
            <motion.div
              key={task._id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: idx * 0.05, duration: 0.3, ease: 'easeOut' }}
            >
              <div
                draggable={editable}
                onDragStart={(e: React.DragEvent) => {
                  e.dataTransfer.setData('taskId', task._id);
                }}
              >
                <TaskCard task={task} editable={editable} />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
