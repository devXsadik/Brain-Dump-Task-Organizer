'use client';

import { useTasks } from '@/context/TaskContext';
import { Brain, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function ModeToggle() {
  const { viewMode, setViewMode } = useTasks();

  return (
    <div className="relative inline-flex bg-bg-primary/80 p-1 rounded-lg border border-border-default">
      <button
        onClick={() => setViewMode('input')}
        className={cn(
          'relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors z-10',
          viewMode === 'input' ? 'text-white' : 'text-text-secondary hover:text-text-primary'
        )}
      >
        {viewMode === 'input' && (
          <motion.div
            layoutId="active-mode"
            className="absolute inset-0 bg-accent rounded-md"
            transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          <Brain className="w-4 h-4" /> Dump
        </span>
      </button>

      <button
        onClick={() => setViewMode('dashboard')}
        className={cn(
          'relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors z-10',
          viewMode === 'dashboard' ? 'text-white' : 'text-text-secondary hover:text-text-primary'
        )}
      >
        {viewMode === 'dashboard' && (
          <motion.div
            layoutId="active-mode"
            className="absolute inset-0 bg-accent rounded-md"
            transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          <LayoutGrid className="w-4 h-4" /> Board
        </span>
      </button>
    </div>
  );
}
