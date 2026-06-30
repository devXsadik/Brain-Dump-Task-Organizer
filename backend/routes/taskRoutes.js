import express from 'express';
import {
  processDump,
  getTasks,
  getUsage,
  toggleTask,
  updateTask,
  deleteTask,
  createTask,
  dailyBrief,
  exportTasks,
  getAnalytics,
} from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';
import { plusGuard, proGuard } from '../middleware/premiumGuard.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const aiRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '20', 10),
  message: { success: false, error: 'Too many requests, please try again later.' },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
});

router.use(protect);

router.get('/usage', getUsage);

router.route('/')
  .get(getTasks)
  .post(createTask);

router.post('/process-dump', aiRateLimiter, processDump);

router.get('/export', plusGuard, exportTasks);
router.get('/analytics', proGuard, getAnalytics);
router.post('/daily-brief', plusGuard, dailyBrief);

router.route('/:id')
  .patch(plusGuard, updateTask)
  .delete(deleteTask);

router.patch('/:id/toggle', toggleTask);

export default router;
