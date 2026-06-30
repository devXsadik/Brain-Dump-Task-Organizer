import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { trackUserEvent } from '../utils/analytics.js';
import { getUsageSnapshot } from '../utils/usageTracker.js';

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signToken = (userId, email) => {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

export const register = asyncHandler(async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(400, parsed.error.errors.map(e => e.message).join(', ')));
  }

  const { name, email, password } = parsed.data;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError(409, 'A user with this email already exists.'));
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    passwordHash,
  });

  trackUserEvent(user._id, 'user_registered', {});

  const token = signToken(user._id, user.email);

  const userResponse = user.toObject();
  delete userResponse.passwordHash;

  res.status(201).json({
    success: true,
    token,
    user: userResponse,
  });
});

export const login = asyncHandler(async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(400, 'Please provide a valid email and password.'));
  }

  const { email, password } = parsed.data;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    return next(new AppError(401, 'Invalid email or password.'));
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return next(new AppError(401, 'Invalid email or password.'));
  }

  const token = signToken(user._id, user.email);

  const userResponse = user.toObject();
  delete userResponse.passwordHash;

  res.status(200).json({
    success: true,
    token,
    user: userResponse,
  });
});

export const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return next(new AppError(404, 'User not found.'));
  }

  res.status(200).json({
    success: true,
    user,
    usage: getUsageSnapshot(user),
  });
});
