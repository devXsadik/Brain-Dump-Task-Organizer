import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError(401, 'You are not logged in. Please log in to get access.'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.userId);

    if (!currentUser) {
      return next(new AppError(401, 'The user belonging to this token no longer exists.'));
    }

    req.user = currentUser;
    next();
  } catch (error) {
    return next(new AppError(401, 'Invalid or expired token.'));
  }
});
