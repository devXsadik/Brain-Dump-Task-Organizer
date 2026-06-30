'use client';

import { useState } from 'react';
import { useTasks } from '@/context/TaskContext';
import { useAuth } from '@/context/AuthContext';
import { UpgradeBanner } from './UpgradeBanner';
import { LockedKanbanPreview } from './LockedKanbanPreview';
import { BrainDumpInput } from '@/components/input/BrainDumpInput';
import { Plus, Check, Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export function SimpleTodo() {
  const [newTask, setNewTask] = useState('');
  const [showDump, setShowDump] = useState(false);
  const { tasks, loading, addSimpleTask, toggleTask, deleteTask } = useTasks();
  const { usage } = useAuth();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    addSimpleTask(newTask.trim());
    setNewTask('');
  };

  const pending = tasks.filter((t) => !t.isCompleted);
  const completed = tasks.filter((t) => t.isCompleted);
  const aiUsed = usage?.aiDumps?.used ?? 0;
  const aiLimit = usage?.aiDumps?.limit ?? 3;
  const aiRemaining = Math.max(0, aiLimit - aiUsed);

  return (
    <div className="max-w-2xl mx-auto w-full animate-fade-in">
      <UpgradeBanner />

      {usage && (
        <div className="mb-4 px-4 py-3 bg-bg-card border border-border-default rounded-xl flex items-center justify-between text-sm">
          <span className="text-text-secondary">
            <Sparkles className="w-4 h-4 inline mr-1.5 text-accent" />
            {aiRemaining > 0
              ? `${aiUsed} of ${aiLimit} free AI dumps used this month`
              : 'Free AI dumps used — upgrade for more'}
          </span>
          {aiRemaining === 0 && (
            <Link href="/pricing" className="text-accent font-medium hover:underline text-xs">
              Upgrade
            </Link>
          )}
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={() => setShowDump(!showDump)}
          className="w-full py-3 rounded-xl border border-accent/30 bg-accent/10 text-accent font-medium text-sm hover:bg-accent/20 transition-colors"
        >
          {showDump ? 'Hide AI Brain Dump' : `Try AI Brain Dump (${aiRemaining} left)`}
        </button>
        {showDump && (
          <div className="mt-4">
            <BrainDumpInput />
          </div>
        )}
      </div>

      <div className="bg-bg-secondary border border-border-default rounded-xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-text-primary mb-6">My Tasks</h2>

        <form onSubmit={handleAdd} className="flex gap-3 mb-6">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a new task..."
            maxLength={200}
            className="flex-1 bg-bg-primary text-text-primary placeholder-text-tertiary border border-border-default rounded-lg px-4 py-3 focus:ring-2 focus:ring-accent outline-none"
          />
          <button
            type="submit"
            disabled={!newTask.trim()}
            className="flex items-center gap-2 px-5 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg font-medium"
          >
            <Plus className="w-5 h-5" />
            Add
          </button>
        </form>

        {loading ? (
          <div className="py-10 text-center text-text-secondary animate-pulse">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-text-tertiary text-sm">No tasks yet. Add your first one above!</p>
          </div>
        ) : (
          <div className="space-y-1">
            <AnimatePresence>
              {pending.map((task) => (
                <motion.div
                  key={task._id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="group flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-bg-card transition-colors"
                >
                  <button
                    onClick={() => toggleTask(task._id)}
                    className="w-5 h-5 rounded-full border-2 border-text-tertiary hover:border-accent flex-shrink-0"
                  />
                  <span className="flex-1 text-sm text-text-primary truncate">{task.title}</span>
                  <button
                    onClick={() => deleteTask(task._id)}
                    className="p-1 text-text-tertiary hover:text-priority-urgent opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {completed.length > 0 && (
              <>
                <div className="pt-4 pb-2 px-4">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Completed ({completed.length})
                  </span>
                </div>
                {completed.map((task) => (
                  <motion.div key={task._id} className="group flex items-center gap-3 px-4 py-3 rounded-lg opacity-50">
                    <button onClick={() => toggleTask(task._id)} className="w-5 h-5 rounded-full bg-accent border-accent flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </button>
                    <span className="flex-1 text-sm text-text-secondary line-through truncate">{task.title}</span>
                  </motion.div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <LockedKanbanPreview />
    </div>
  );
}
