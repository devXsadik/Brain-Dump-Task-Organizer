import express from 'express';
import { createCheckout, createPortal, handleWebhook, getPaymentInfo } from '../controllers/subscriptionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/provider', getPaymentInfo);
router.post('/create-checkout', protect, createCheckout);
router.post('/create-portal', protect, createPortal);
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router;
