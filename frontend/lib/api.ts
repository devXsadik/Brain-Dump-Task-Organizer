import { Task, User, UsageSnapshot, VoiceCommandResponse, VoiceCommandsResponse, DailyBriefResponse, AnalyticsResponse, BillingPeriod } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData.error) errorMsg = errorData.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  if (res.headers.get('content-type')?.includes('text/csv')) {
    return res.text() as Promise<T>;
  }

  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    fetchAPI<{ success: true; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    fetchAPI<{ success: true; token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  getMe: () => fetchAPI<{ success: true; user: User; usage?: UsageSnapshot }>('/auth/me'),

  getUsage: () => fetchAPI<{ success: true; usage: UsageSnapshot }>('/tasks/usage'),

  processDump: (rawText: string) =>
    fetchAPI<{ success: boolean; batchId: string; tasks: Task[]; count: number; usage?: UsageSnapshot }>(
      '/tasks/process-dump',
      { method: 'POST', body: JSON.stringify({ rawText }) }
    ),

  getTasks: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchAPI<{ success: true; tasks: Task[]; count: number; usage?: UsageSnapshot }>(`/tasks${query}`);
  },

  addTask: (title: string, extras?: { isRecurring?: boolean; recurrenceRule?: string; reminderAt?: string }) =>
    fetchAPI<{ success: true; task: Task }>('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, ...extras }),
    }),

  updateTask: (taskId: string, updates: Partial<Task>) =>
    fetchAPI<{ success: true; task: Task }>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  toggleTask: (taskId: string) =>
    fetchAPI<{ success: true; task: Task }>(`/tasks/${taskId}/toggle`, { method: 'PATCH' }),

  deleteTask: (taskId: string) =>
    fetchAPI<{ success: true }>(`/tasks/${taskId}`, { method: 'DELETE' }),

  dailyBrief: () =>
    fetchAPI<DailyBriefResponse>('/tasks/daily-brief', { method: 'POST', body: '{}' }),

  exportTasks: async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/tasks/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    return res.text();
  },

  getAnalytics: () => fetchAPI<AnalyticsResponse>('/tasks/analytics'),

  createCheckout: (plan: 'plus' | 'pro', billing: BillingPeriod = 'monthly') =>
    fetchAPI<{ success: true; url: string }>('/subscription/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ plan, billing }),
    }),

  createPortal: () =>
    fetchAPI<{ success: true; url: string }>('/subscription/create-portal', { method: 'POST' }),

  getAuthUrl: () => fetchAPI<{ success: true; url: string }>('/calendar/auth-url'),

  disconnectCalendar: () =>
    fetchAPI<{ success: true }>('/calendar/disconnect', { method: 'POST' }),

  toggleAlarms: (enabled: boolean) =>
    fetchAPI<{ success: true; alarmsEnabled: boolean }>('/calendar/toggle-alarms', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),

  voiceCommand: (transcript: string, confirmDelete = false) =>
    fetchAPI<VoiceCommandResponse>('/voice/command', {
      method: 'POST',
      body: JSON.stringify({ transcript, confirmDelete }),
    }),

  voiceTranscribe: (audio: string, mimetype = 'audio/webm', languageHint?: string) =>
    fetchAPI<import('./types').VoiceTranscribeResponse>('/voice/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audio, mimetype, languageHint }),
    }),

  getVoiceSettings: () => fetchAPI<import('./types').VoiceSettingsResponse>('/voice/settings'),

  patchVoiceSettings: (settings: Partial<import('./types').VoiceSettings>) =>
    fetchAPI<import('./types').VoiceSettingsResponse>('/voice/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }),

  getVoiceCommands: () => fetchAPI<VoiceCommandsResponse>('/voice/commands'),
};

export const trackClientEvent = (event: string, properties: Record<string, unknown> = {}) => {
  if (typeof window === 'undefined') return;
  console.info('[analytics]', event, properties);
};
