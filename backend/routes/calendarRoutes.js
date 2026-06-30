import express from 'express';
import { getAuthUrl, oauthCallback, disconnectCalendar, toggleAlarms } from '../controllers/calendarController.js';
import { protect } from '../middleware/auth.js';
import { proGuard } from '../middleware/premiumGuard.js';

const router = express.Router();

router.get('/auth-url', protect, proGuard, getAuthUrl);
router.get('/callback', oauthCallback);
router.post('/disconnect', protect, proGuard, disconnectCalendar);
router.post('/toggle-alarms', protect, proGuard, toggleAlarms);

export default router;
