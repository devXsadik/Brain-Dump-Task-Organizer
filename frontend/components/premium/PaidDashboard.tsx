'use client';

import { ModeToggle } from '@/components/shared/ModeToggle';
import { BrainDumpInput } from '@/components/input/BrainDumpInput';
import { KanbanBoard } from '@/components/dashboard/KanbanBoard';
import { DailyBriefCard } from '@/components/premium/DailyBriefCard';
import { AnalyticsPanel } from '@/components/premium/AnalyticsPanel';
import { VoiceAssistantPanel } from '@/components/voice/VoiceAssistant';
import { VoiceToolbarChip } from '@/components/voice/VoiceToolbarChip';
import { VoiceAssistantProvider } from '@/context/VoiceAssistantContext';
import { RecurringTaskAdd } from '@/components/premium/RecurringTaskAdd';
import { useTasks } from '@/context/TaskContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Bell, BellOff, CalendarDays, Download, Link2, Unlink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PaidDashboardProps {
  isPro: boolean;
}

function ToolbarButton({
  onClick,
  disabled,
  active,
  children,
  className,
}: {
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50',
        active
          ? 'border-accent/30 bg-accent/10 text-accent'
          : 'border-border-default bg-bg-primary/50 text-text-secondary hover:text-text-primary hover:bg-bg-primary',
        className
      )}
    >
      {children}
    </button>
  );
}

export function PaidDashboard({ isPro }: PaidDashboardProps) {
  const { viewMode } = useTasks();
  const { user, refreshUser, usage } = useAuth();
  const [loadingAlarms, setLoadingAlarms] = useState(false);

  const hasCalendar = !!user?.googleTokens?.refreshToken;
  const aiUsed = usage?.aiDumps?.used ?? 0;
  const aiLimit = usage?.aiDumps?.limit ?? 0;
  const voiceUsed = usage?.voiceCommands?.used ?? 0;
  const voiceLimit = usage?.voiceCommands?.limit ?? 0;

  const handleExport = async () => {
    try {
      const csv = await api.exportTasks();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'brain-dump-tasks.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Tasks exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleLinkCalendar = async () => {
    const res = await api.getAuthUrl();
    if (res.success && res.url) window.location.href = res.url;
  };

  const toggleAlarms = async () => {
    try {
      setLoadingAlarms(true);
      await api.toggleAlarms(!user?.alarmsEnabled);
      refreshUser();
    } finally {
      setLoadingAlarms(false);
    }
  };

  const dashboard = (
    <div className="w-full max-w-6xl mx-auto space-y-5 py-2 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary tracking-tight">
            {user?.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {isPro
              ? 'Pro plan — AI dumps, Kanban, voice & calendar'
              : 'Plus plan — AI organization & full Kanban'}
            {usage && (
              <span className="text-text-tertiary">
                {' '}
                · {aiUsed}/{aiLimit} AI dumps
                {isPro && voiceLimit > 0 && ` · ${voiceUsed}/${voiceLimit} voice cmds today`}
              </span>
            )}
          </p>
        </div>
        <ModeToggle />
      </div>

      {isPro && <AnalyticsPanel />}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-default bg-bg-card/40 p-2">
        <DailyBriefCard />
        <ToolbarButton onClick={handleExport}>
          <Download className="w-4 h-4" />
          Export
        </ToolbarButton>

        {isPro && (
          <>
            <VoiceToolbarChip />
            {hasCalendar ? (
              <ToolbarButton onClick={() => api.disconnectCalendar().then(refreshUser)}>
                <Unlink className="w-4 h-4" />
                Disconnect calendar
              </ToolbarButton>
            ) : (
              <ToolbarButton onClick={handleLinkCalendar}>
                <Link2 className="w-4 h-4" />
                Link calendar
              </ToolbarButton>
            )}
            <ToolbarButton
              onClick={toggleAlarms}
              disabled={loadingAlarms}
              active={!!user?.alarmsEnabled}
            >
              {user?.alarmsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              Alarms {user?.alarmsEnabled ? 'on' : 'off'}
            </ToolbarButton>
          </>
        )}
      </div>

      {isPro && viewMode === 'dashboard' && <RecurringTaskAdd />}

      {/* Main workspace */}
      <div className="relative min-h-[420px]">
        {viewMode === 'input' ? (
          <BrainDumpInput />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-text-tertiary px-1">
              <CalendarDays className="w-4 h-4" />
              Drag tasks between columns to reprioritize
            </div>
            <KanbanBoard editable />
          </div>
        )}
        {isPro && <VoiceAssistantPanel />}
      </div>
    </div>
  );

  if (isPro) {
    return <VoiceAssistantProvider>{dashboard}</VoiceAssistantProvider>;
  }

  return dashboard;
}
