import logger from './logger.js';

/**
 * Lightweight product analytics — logs structured events for conversion/activation tracking.
 */
export const trackEvent = (event, properties = {}) => {
  logger.info({ event, ...properties, ts: new Date().toISOString() }, `analytics:${event}`);
};

export const trackUserEvent = (userId, event, properties = {}) => {
  trackEvent(event, { userId: userId?.toString(), ...properties });
};
