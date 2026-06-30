import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';

  if (!err.isOperational) {
    logger.error({ err }, 'Unhandled Exception');
  } else {
    logger.warn({ err: err.message, status: statusCode }, 'Operational Error');
  }

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(el => el.message);
    return res.status(400).json({ success: false, error: errors.join('. ') });
  }

  if (err.code === 11000) {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    return res.status(409).json({ success: false, error: `Duplicate field value: ${value}. Please use another value!` });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, error: 'Invalid token. Please log in again.' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: 'Your token has expired! Please log in again.' });
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
