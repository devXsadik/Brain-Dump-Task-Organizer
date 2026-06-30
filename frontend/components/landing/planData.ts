export type PlanId = 'free' | 'plus' | 'pro';

export type TierIcon = 'brain' | 'sparkles' | 'calendar' | 'mic';

export interface LandingPlan {
  id: PlanId;
  name: string;
  price: string;
  annualPrice: string;
  tagline: string;
  bestFor: string;
  cta: string;
  href: string;
  highlight: boolean;
  trial?: boolean;
  highlights: string[];
}

export const LANDING_PLANS: LandingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    annualPrice: '$0',
    tagline: 'Try the workflow',
    bestFor: 'Testing Brain-Dump before you commit',
    cta: 'Start free',
    href: '/register',
    highlight: false,
    highlights: [
      'Manual checklist',
      '3 AI brain dumps / month',
      'Locked Kanban preview',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    price: '$6',
    annualPrice: '$58',
    tagline: 'AI + Kanban daily driver',
    bestFor: 'Professionals who brain-dump every day',
    cta: 'Get Plus',
    href: '/pricing',
    highlight: false,
    highlights: [
      '100 AI dumps / month',
      'Full 3-column Kanban',
      'Daily AI focus brief',
      'Drag-and-drop & CSV export',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$8',
    annualPrice: '$76',
    tagline: 'Voice + calendar automation',
    bestFor: 'Power users who want hands-free control',
    cta: 'Start 7-day trial',
    href: '/pricing',
    highlight: true,
    trial: true,
    highlights: [
      'Everything in Plus',
      'Voice Assistant',
      'Google Calendar sync',
      'Meeting reminders & analytics',
    ],
  },
];

export interface ComparisonRow {
  feature: string;
  free: string | boolean;
  plus: string | boolean;
  pro: string | boolean;
}

export const PLAN_COMPARISON: ComparisonRow[] = [
  { feature: 'Manual tasks', free: true, plus: true, pro: true },
  { feature: 'AI brain dumps', free: '3 / mo', plus: '100 / mo', pro: '200 / mo' },
  { feature: 'Kanban board', free: 'Preview', plus: 'Full', pro: 'Full' },
  { feature: 'Priorities & time estimates', free: false, plus: true, pro: true },
  { feature: 'Daily AI brief', free: false, plus: true, pro: true },
  { feature: 'Voice Assistant', free: false, plus: false, pro: true },
  { feature: 'Google Calendar sync', free: false, plus: false, pro: true },
  { feature: 'Meeting reminders', free: false, plus: false, pro: true },
  { feature: 'Productivity analytics', free: false, plus: false, pro: true },
];

export interface TierFeature {
  icon: TierIcon;
  title: string;
  desc: string;
  plans: PlanId[];
}

export const TIER_FEATURES: TierFeature[] = [
  {
    icon: 'brain',
    title: 'AI brain dump',
    desc: 'Paste messy notes or speak freely. AI extracts tasks with priority, tags, and time estimates.',
    plans: ['free', 'plus', 'pro'],
  },
  {
    icon: 'sparkles',
    title: 'Smart Kanban board',
    desc: 'Tasks land in Today, This Week, or Backlog so you always know what needs attention now.',
    plans: ['plus', 'pro'],
  },
  {
    icon: 'calendar',
    title: 'Calendar & meetings',
    desc: 'Meetings from your dump sync to Google Calendar with reminders before they start.',
    plans: ['pro'],
  },
  {
    icon: 'mic',
    title: 'Voice Assistant',
    desc: 'Create, edit, and complete tasks by voice — ideal when you are on the move.',
    plans: ['pro'],
  },
];

export const WORKFLOW_STEPS = [
  {
    step: '1',
    title: 'Dump everything',
    desc: 'Type or speak meetings, todos, and ideas in plain language. No formatting needed.',
    example: '"Call Sarah about budget, fix login bug today, research analytics tools sometime..."',
  },
  {
    step: '2',
    title: 'AI organizes',
    desc: 'Our AI reads your dump, extracts tasks, sets priority, estimates time, and detects meetings.',
    example: '6 tasks created · 2 urgent · 1 meeting found',
  },
  {
    step: '3',
    title: 'Work with clarity',
    desc: 'Your Kanban board shows what to do today, this week, and later. Check off and move on.',
    example: 'Today: Fix login bug · Standup prep at 9 AM',
  },
];
