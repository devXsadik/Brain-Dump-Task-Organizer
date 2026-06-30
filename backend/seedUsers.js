/**
 * Seed dev users for all subscription tiers (Free / Plus / Pro).
 *
 * Run: node seedUsers.js
 * Password for all accounts: password123
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import User from './models/User.js';
import Task from './models/Task.js';

dotenv.config();

const PASSWORD = 'password123';

const SEED_EMAILS = [
  'free@example.com',
  'plus@example.com',
  'pro@example.com',
  'premium@example.com', // legacy alias → same as Pro
];

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const currentDay = () => new Date().toISOString().split('T')[0];

const hashPassword = (password) => bcrypt.hash(password, 12);

const yearFromNow = () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

const SEED_USERS = [
  {
    name: 'Free Tester',
    email: 'free@example.com',
    subscription: {
      status: 'free',
      plan: 'free',
      provider: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
    },
    aiUsageCount: 2,
    dumpCount: 2,
    alarmsEnabled: false,
  },
  {
    name: 'Plus Tester',
    email: 'plus@example.com',
    subscription: {
      status: 'active',
      plan: 'plus',
      provider: 'lemonsqueezy',
      lemonCustomerId: 'seed_ls_customer_plus',
      lemonSubscriptionId: 'seed_ls_sub_plus',
      currentPeriodEnd: yearFromNow(),
      trialEndsAt: null,
    },
    aiUsageCount: 12,
    dumpCount: 15,
    dailyBriefCount: 1,
    alarmsEnabled: false,
  },
  {
    name: 'Pro Tester',
    email: 'pro@example.com',
    subscription: {
      status: 'active',
      plan: 'pro',
      provider: 'lemonsqueezy',
      lemonCustomerId: 'seed_ls_customer_pro',
      lemonSubscriptionId: 'seed_ls_sub_pro',
      currentPeriodEnd: yearFromNow(),
      trialEndsAt: null,
    },
    aiUsageCount: 28,
    dumpCount: 40,
    voiceUsageCount: 5,
    dailyBriefCount: 1,
    alarmsEnabled: true,
    voiceSettings: {
      activationMode: 'always',
      replyLanguage: 'auto',
      sttStrategy: 'auto',
    },
  },
  {
    name: 'Pro Tester (legacy email)',
    email: 'premium@example.com',
    subscription: {
      status: 'active',
      plan: 'pro',
      provider: 'lemonsqueezy',
      lemonCustomerId: 'seed_ls_customer_pro_legacy',
      lemonSubscriptionId: 'seed_ls_sub_pro_legacy',
      currentPeriodEnd: yearFromNow(),
      trialEndsAt: null,
    },
    aiUsageCount: 5,
    dumpCount: 8,
    voiceUsageCount: 2,
    dailyBriefCount: 0,
    alarmsEnabled: true,
  },
];

function buildTasks(userId, plan) {
  const batchId = uuidv4();
  const source = 'Seeded sample brain dump for development.';

  const base = [
    {
      title: 'Fix production login bug',
      description: 'Users cannot sign in with Google OAuth in production.',
      priority: 'urgent',
      category: 'today',
      tags: ['bug', 'auth'],
      estimatedMinutes: 60,
      sourceText: source,
      dumpBatchId: batchId,
    },
    {
      title: 'Team standup prep',
      description: 'Review yesterday blockers and today priorities.',
      priority: 'high',
      category: 'today',
      tags: ['meeting'],
      estimatedMinutes: 15,
      isMeeting: true,
      meetingTime: daysFromNow(1),
      reminderAt: daysFromNow(1),
      sourceText: source,
      dumpBatchId: batchId,
    },
    {
      title: 'Update API documentation',
      description: 'Document new subscription and voice endpoints.',
      priority: 'medium',
      category: 'this_week',
      tags: ['docs'],
      estimatedMinutes: 120,
      sourceText: source,
      dumpBatchId: batchId,
    },
    {
      title: 'Review Q2 roadmap',
      priority: 'medium',
      category: 'this_week',
      tags: ['planning'],
      estimatedMinutes: 45,
      sourceText: source,
      dumpBatchId: batchId,
    },
    {
      title: 'Research analytics tools',
      priority: 'low',
      category: 'backlog',
      tags: ['research'],
      sourceText: source,
      dumpBatchId: batchId,
    },
  ];

  if (plan === 'free') {
    return [
      {
        title: 'Buy groceries',
        priority: 'medium',
        category: 'today',
        tags: ['personal'],
        estimatedMinutes: 30,
        sourceText: 'Manual task — free tier checklist.',
        dumpBatchId: uuidv4(),
      },
      {
        title: 'Reply to client email',
        priority: 'high',
        category: 'today',
        tags: ['work'],
        estimatedMinutes: 20,
        sourceText: 'Manual task — free tier checklist.',
        dumpBatchId: uuidv4(),
      },
    ].map((t) => ({ ...t, userId }));
  }

  if (plan === 'plus') {
    return base.map((t) => ({ ...t, userId }));
  }

  // Pro — full board + recurring task
  return [
    ...base.map((t) => ({ ...t, userId })),
    {
      title: 'Weekly team sync',
      description: 'Recurring planning session.',
      priority: 'medium',
      category: 'this_week',
      tags: ['meeting', 'recurring'],
      estimatedMinutes: 30,
      isRecurring: true,
      recurrenceRule: 'weekly',
      isMeeting: true,
      meetingTime: daysFromNow(7),
      sourceText: source,
      dumpBatchId: batchId,
      userId,
    },
    {
      title: 'Redesign onboarding flow',
      priority: 'low',
      category: 'backlog',
      tags: ['design'],
      sourceText: source,
      dumpBatchId: batchId,
      userId,
    },
  ];
}

async function seedUsers() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not set in backend/.env');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for seeding...\n');

    const existing = await User.find({ email: { $in: SEED_EMAILS } }).select('_id email');
    if (existing.length > 0) {
      const ids = existing.map((u) => u._id);
      await Task.deleteMany({ userId: { $in: ids } });
      await User.deleteMany({ _id: { $in: ids } });
      console.log(`Removed ${existing.length} existing seed user(s) and their tasks.`);
    }

    const passwordHash = await hashPassword(PASSWORD);
    const month = currentMonth();
    const day = currentDay();

    const created = [];

    for (const seed of SEED_USERS) {
      const user = await User.create({
        name: seed.name,
        email: seed.email,
        passwordHash,
        dumpCount: seed.dumpCount ?? 0,
        lastDumpAt: new Date(),
        subscription: seed.subscription,
        aiUsageCount: seed.aiUsageCount ?? 0,
        aiUsageMonth: month,
        voiceUsageCount: seed.voiceUsageCount ?? 0,
        voiceUsageDay: day,
        dailyBriefCount: seed.dailyBriefCount ?? 0,
        dailyBriefDate: day,
        alarmsEnabled: seed.alarmsEnabled ?? false,
        preferences: { timezone: 'UTC', defaultPriority: 'medium' },
      });

      const plan = seed.subscription.plan;
      const tasks = buildTasks(user._id, plan);
      if (tasks.length > 0) {
        await Task.insertMany(tasks);
      }

      created.push({ user, taskCount: tasks.length });
    }

    console.log('✅ Seed users created!\n');
    console.log('Password for all accounts: password123\n');
    console.log('┌─────────────────────────┬──────────┬────────────────────────────────────────────┐');
    console.log('│ Email                   │ Plan     │ What to test                               │');
    console.log('├─────────────────────────┼──────────┼────────────────────────────────────────────┤');
    console.log('│ free@example.com        │ Free     │ Manual tasks, 2/3 AI dumps used, Kanban preview │');
    console.log('│ plus@example.com        │ Plus $6  │ Full Kanban, daily brief, 12/100 AI dumps  │');
    console.log('│ pro@example.com         │ Pro $8   │ Voice, calendar, meetings, analytics     │');
    console.log('│ premium@example.com     │ Pro      │ Legacy Pro login (same features as pro@)   │');
    console.log('└─────────────────────────┴──────────┴────────────────────────────────────────────┘\n');

    for (const { user, taskCount } of created) {
      console.log(`  • ${user.email} — ${taskCount} sample task(s)`);
    }

    console.log('\nRun: node seedUsers.js');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();
