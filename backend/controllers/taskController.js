import { v4 as uuidv4 } from 'uuid';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { processRawDump } from '../services/aiService.js';
import { generateDailyBrief } from '../services/briefService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';
import { google } from 'googleapis';
import { checkAndIncrementAiDump, checkAndIncrementDailyBrief, getUsageSnapshot } from '../utils/usageTracker.js';
import { isProPlan } from '../utils/planHelpers.js';
import { trackUserEvent } from '../utils/analytics.js';

const syncMeetingsToCalendar = async (userId, insertedTasks) => {
  const user = await User.findById(userId);
  if (!user?.googleTokens?.refreshToken || !isProPlan(user.subscription?.plan)) return;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5001/api/calendar/callback'
  );
  oauth2Client.setCredentials({
    access_token: user.googleTokens.accessToken,
    refresh_token: user.googleTokens.refreshToken,
    expiry_date: user.googleTokens.expiryDate,
  });

  if (user.googleTokens.expiryDate && Date.now() >= user.googleTokens.expiryDate) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await User.findByIdAndUpdate(userId, {
        'googleTokens.accessToken': credentials.access_token,
        'googleTokens.expiryDate': credentials.expiry_date,
      });
      oauth2Client.setCredentials(credentials);
    } catch (refreshError) {
      logger.error({ error: refreshError.message }, 'Failed to refresh Google token');
      return;
    }
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  for (const task of insertedTasks) {
    if (task.isMeeting && task.meetingTime) {
      try {
        const startTime = new Date(task.meetingTime);
        const endTime = new Date(startTime.getTime() + (task.estimatedMinutes || 60) * 60000);
        await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: task.title,
            description: task.description,
            start: { dateTime: startTime.toISOString() },
            end: { dateTime: endTime.toISOString() },
          },
        });
      } catch (error) {
        logger.error({ error: error.message }, 'Google Calendar sync failed');
      }
    }
  }
};

export const processDump = asyncHandler(async (req, res, next) => {
  const { rawText } = req.body;

  if (!rawText) {
    return next(new AppError(400, 'Please provide rawText.'));
  }

  const user = await User.findById(req.user._id);
  const usage = await checkAndIncrementAiDump(user);

  const extractedTasks = await processRawDump(rawText);

  if (extractedTasks.length === 0) {
    return res.status(200).json({
      success: true,
      batchId: null,
      tasks: [],
      count: 0,
      message: 'No actionable tasks found.',
      usage,
    });
  }

  const dumpBatchId = uuidv4();
  const mappedTasks = extractedTasks.map((task) => ({
    ...task,
    userId: req.user._id,
    sourceText: rawText,
    dumpBatchId,
  }));

  const insertedTasks = await Task.insertMany(mappedTasks);
  await syncMeetingsToCalendar(req.user._id, insertedTasks);

  await User.findByIdAndUpdate(req.user._id, {
    $inc: { dumpCount: 1 },
    lastDumpAt: Date.now(),
  });

  trackUserEvent(req.user._id, 'ai_dump_completed', {
    plan: user.subscription?.plan,
    taskCount: insertedTasks.length,
  });

  res.status(201).json({
    success: true,
    batchId: dumpBatchId,
    count: insertedTasks.length,
    tasks: insertedTasks,
    usage,
  });
});

export const getTasks = asyncHandler(async (req, res, next) => {
  const { category, status } = req.query;
  const filter = { userId: req.user._id };
  if (category) filter.category = category;
  if (status) filter.status = status;

  const tasks = await Task.find(filter).sort({ createdAt: -1 });
  const user = await User.findById(req.user._id);
  const usage = getUsageSnapshot(user);

  res.status(200).json({ success: true, count: tasks.length, tasks, usage });
});

export const getUsage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({ success: true, usage: getUsageSnapshot(user) });
});

export const toggleTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
  if (!task) return next(new AppError(404, 'Task not found'));

  task.isCompleted = !task.isCompleted;
  task.status = task.isCompleted ? 'completed' : 'pending';
  task.completedAt = task.isCompleted ? Date.now() : null;
  await task.save();

  trackUserEvent(req.user._id, 'kanban_task_completed', { completed: task.isCompleted });

  res.status(200).json({ success: true, task });
});

export const updateTask = asyncHandler(async (req, res, next) => {
  const allowed = ['title', 'description', 'priority', 'category', 'tags', 'estimatedMinutes', 'isRecurring', 'recurrenceRule', 'reminderAt'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!task) return next(new AppError(404, 'Task not found'));
  res.status(200).json({ success: true, task });
});

export const deleteTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!task) return next(new AppError(404, 'Task not found'));
  res.status(200).json({ success: true, data: null });
});

export const createTask = asyncHandler(async (req, res, next) => {
  const { title, isRecurring, recurrenceRule, reminderAt } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return next(new AppError(400, 'Please provide a task title.'));
  }
  if (title.length > 200) {
    return next(new AppError(400, 'Title must not exceed 200 characters.'));
  }

  const task = await Task.create({
    userId: req.user._id,
    title: title.trim(),
    description: '',
    priority: 'medium',
    category: 'backlog',
    tags: [],
    estimatedMinutes: null,
    sourceText: title.trim(),
    dumpBatchId: uuidv4(),
    isRecurring: !!isRecurring,
    recurrenceRule: isRecurring ? recurrenceRule || 'weekly' : null,
    reminderAt: reminderAt || null,
  });

  res.status(201).json({ success: true, task });
});

export const dailyBrief = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  await checkAndIncrementDailyBrief(user);

  const tasks = await Task.find({ userId: req.user._id, isCompleted: false }).sort({ createdAt: -1 });
  const brief = await generateDailyBrief(tasks);

  trackUserEvent(req.user._id, 'daily_brief_generated', { plan: user.subscription?.plan });

  res.status(200).json({ success: true, ...brief });
});

export const exportTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
  const header = 'title,description,priority,category,tags,estimatedMinutes,isCompleted,isMeeting,meetingTime,createdAt\n';
  const rows = tasks.map((t) => {
    const esc = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
    return [
      esc(t.title),
      esc(t.description),
      t.priority,
      t.category,
      esc((t.tags || []).join(';')),
      t.estimatedMinutes || '',
      t.isCompleted,
      t.isMeeting,
      t.meetingTime ? new Date(t.meetingTime).toISOString() : '',
      new Date(t.createdAt).toISOString(),
    ].join(',');
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="brain-dump-tasks.csv"');
  res.send(header + rows.join('\n'));
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [total, completed, completedThisWeek, pending, byCategory] = await Promise.all([
    Task.countDocuments({ userId }),
    Task.countDocuments({ userId, isCompleted: true }),
    Task.countDocuments({ userId, isCompleted: true, completedAt: { $gte: weekAgo } }),
    Task.countDocuments({ userId, isCompleted: false }),
    Task.aggregate([
      { $match: { userId, isCompleted: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  ]);

  const user = await User.findById(userId);
  const categoryMap = { today: 0, this_week: 0, backlog: 0 };
  byCategory.forEach((c) => { categoryMap[c._id] = c.count; });

  res.status(200).json({
    success: true,
    analytics: {
      totalTasks: total,
      completedTasks: completed,
      completedThisWeek,
      pendingTasks: pending,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
      dumpCount: user.dumpCount || 0,
      byCategory: categoryMap,
      streak: user.dumpCount > 0 ? Math.min(user.dumpCount, 30) : 0,
    },
  });
});
