'use client';

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { Task, ViewMode } from '../lib/types';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

interface TaskContextValue {
  tasks: Task[];
  loading: boolean;
  processing: boolean;
  error: string | null;
  viewMode: ViewMode;
  processDump: (rawText: string) => Promise<void>;
  fetchTasks: () => Promise<void>;
  syncTasksFromVoice: (tasks: Task[]) => void;
  addSimpleTask: (title: string) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  clearError: () => void;
  todayTasks: Task[];
  weekTasks: Task[];
  backlogTasks: Task[];
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('input');
  const { isAuthenticated, loading: authLoading, refreshUsage } = useAuth();

  const fetchTasks = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await api.getTasks();
      setTasks(res.tasks);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchTasks();
    }
    if (!authLoading && !isAuthenticated) {
      setTasks([]);
    }
  }, [authLoading, isAuthenticated, fetchTasks]);

  const processDump = async (rawText: string) => {
    try {
      setProcessing(true);
      const res = await api.processDump(rawText);
      if (res.tasks && res.tasks.length > 0) {
        setTasks((prev) => [...res.tasks, ...prev]);
        toast.success(`Organized ${res.tasks.length} tasks!`);
        setViewMode('dashboard');
      } else {
        toast.info('No actionable tasks found in your dump.');
      }
      await refreshUsage();
      setError(null);
    } catch (err: any) {
      if (err.message.includes('Upgrade') || err.message.includes('limit')) {
        toast.error(err.message, {
          action: { label: 'Upgrade', onClick: () => (window.location.href = '/pricing') },
        });
      } else {
        toast.error('Failed to process brain dump');
      }
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const syncTasksFromVoice = useCallback((next: Task[]) => {
    setTasks(next);
    setViewMode('dashboard');
  }, []);

  const addSimpleTask = async (title: string) => {
    try {
      const res = await api.addTask(title);
      setTasks((prev) => [res.task, ...prev]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add task');
    }
  };

  const toggleTask = async (taskId: string) => {
    setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, isCompleted: !t.isCompleted } : t)));
    try {
      await api.toggleTask(taskId);
    } catch {
      toast.error('Failed to update task');
      fetchTasks();
    }
  };

  const deleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    try {
      await api.deleteTask(taskId);
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
      fetchTasks();
    }
  };

  const clearError = () => setError(null);

  const todayTasks = useMemo(() => tasks.filter((t) => t.category === 'today'), [tasks]);
  const weekTasks = useMemo(() => tasks.filter((t) => t.category === 'this_week'), [tasks]);
  const backlogTasks = useMemo(() => tasks.filter((t) => t.category === 'backlog'), [tasks]);

  const value = {
    tasks, loading, processing, error, viewMode,
    processDump, fetchTasks, syncTasksFromVoice, addSimpleTask, toggleTask, deleteTask, setViewMode, clearError,
    todayTasks, weekTasks, backlogTasks,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTasks must be used within a TaskProvider');
  return context;
}
