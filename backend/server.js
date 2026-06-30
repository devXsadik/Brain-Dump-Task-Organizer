import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { pinoHttp } from 'pino-http';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import rateLimit from 'express-rate-limit';

import logger from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import taskRoutes from './routes/taskRoutes.js';
import authRoutes from './routes/authRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Payment webhooks need raw body — mount BEFORE json parser
app.use('/api/subscription/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Global Rate Limiting
const globalLimiter = rateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: { success: false, error: 'Too many requests from this IP, please try again in 15 minutes!' },
});
app.use('/api', globalLimiter);

app.use(pinoHttp({ logger }));

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/braindump');
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

connectDB();

const authLimiter = rateLimit({
  max: 100, // Increased limit for easier testing in development
  windowMs: 15 * 60 * 1000,
  message: { success: false, error: 'Too many auth attempts from this IP, please try again after 15 minutes.' },
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/voice', voiceRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Brain-Dump Task Organizer API' });
});

app.use((req, res, next) => {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
