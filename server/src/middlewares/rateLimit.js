const rateLimit = require('express-rate-limit');
const config = require('../config');

const handler = (_req, res) =>
  res.status(429).json({ success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later' } });

const skip = () => config.isTest;

const apiLimiter = rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false, handler, skip });

/** Strict limiter for login, registration and password-reset endpoints */
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, handler, skip });

/** GPS updates over REST (socket updates have their own per-trip throttle) */
const locationLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, handler, skip });

module.exports = { apiLimiter, authLimiter, locationLimiter };
