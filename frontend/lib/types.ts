export interface Task {
  _id: string;
  userId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'today' | 'this_week' | 'backlog';
  tags: string[];
  estimatedMinutes: number | null;
  status: 'pending' | 'in_progress' | 'completed' | 'archived';
  isCompleted: boolean;
  isMeeting?: boolean;
  meetingTime?: string | null;
  isRecurring?: boolean;
  recurrenceRule?: 'daily' | 'weekly' | 'monthly' | null;
  reminderAt?: string | null;
  completedAt: string | null;
  sourceText: string;
  dumpBatchId: string;
  createdAt: string;
  updatedAt: string;
}

export type PlanType = 'free' | 'plus' | 'pro' | 'premium';

export interface UsageQuota {
  used: number;
  limit: number;
}

export interface UsageSnapshot {
  aiDumps: UsageQuota;
  voiceCommands: UsageQuota;
  dailyBriefs: UsageQuota;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  avatar: string | null;
  preferences: {
    timezone: string;
    defaultPriority: Task['priority'];
  };
  dumpCount: number;
  lastDumpAt: string | null;
  subscription: {
    status: 'free' | 'active' | 'canceled' | 'past_due' | 'trialing';
    plan: PlanType;
    provider?: 'stripe' | 'lemonsqueezy' | null;
    currentPeriodEnd: string | null;
    trialEndsAt?: string | null;
  };
  googleTokens?: {
    refreshToken?: string | null;
  };
  alarmsEnabled?: boolean;
}

export interface VoiceClarificationOption {
  id: string;
  title: string;
  index?: number;
}

export interface VoiceCommandResponse {
  success: boolean;
  spokenReply: string;
  needsConfirmation: boolean;
  needsClarification?: boolean;
  clarificationOptions?: VoiceClarificationOption[];
  actionsApplied: { type: string; taskId?: string; count?: number }[];
  tasks: Task[];
  intent?: string;
  pendingTranscript?: string;
  originalTranscript?: string;
  translatedCommand?: string;
  detectedLanguage?: string;
  detectedLanguageName?: string;
  latencyMs?: number;
}

export type VoiceActivationMode = 'always' | 'hey_dump' | 'manual';
export type VoiceSttStrategy = 'auto' | 'browser' | 'whisper';
export type VoiceReplyLanguage = 'en' | 'auto';

export interface VoiceSettings {
  activationMode: VoiceActivationMode;
  replyLanguage: VoiceReplyLanguage;
  sttStrategy: VoiceSttStrategy;
}

export interface VoiceSettingsResponse {
  success: boolean;
  settings: VoiceSettings;
}

export interface VoiceTranscribeResponse {
  success: boolean;
  transcript: string;
  language: string;
  duration?: number;
}

export interface VoiceCommandItem {
  phrase: string;
  action: string;
}

export interface VoiceCommandsResponse {
  success: boolean;
  commands: VoiceCommandItem[];
  tips: string[];
}

export interface DailyBriefResponse {
  success: boolean;
  brief: string;
  focusItems: string[];
}

export interface AnalyticsResponse {
  success: boolean;
  analytics: {
    totalTasks: number;
    completedTasks: number;
    completedThisWeek: number;
    pendingTasks: number;
    completionRate: number;
    dumpCount: number;
    byCategory: { today: number; this_week: number; backlog: number };
    streak: number;
  };
}

export type ViewMode = 'input' | 'dashboard';

export type BillingPeriod = 'monthly' | 'annual';
