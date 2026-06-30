import express from 'express';
import {
  voiceCommand,
  voiceTranscribe,
  listVoiceCommands,
  getVoiceSettings,
  patchVoiceSettings,
} from '../controllers/voiceController.js';
import { protect } from '../middleware/auth.js';
import { proGuard } from '../middleware/premiumGuard.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const voiceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
});

router.get('/commands', protect, proGuard, listVoiceCommands);
router.get('/settings', protect, proGuard, getVoiceSettings);
router.patch('/settings', protect, proGuard, patchVoiceSettings);
router.post('/command', protect, proGuard, voiceLimiter, voiceCommand);
router.post('/transcribe', protect, proGuard, voiceLimiter, voiceTranscribe);

export default router;
