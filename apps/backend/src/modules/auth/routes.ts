import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import * as controller from './controller.js';

const rateLimitBody = (message: string) => ({
  error: { message, code: 'RATE_LIMITED' as const },
});

/** Slow down credential stuffing without locking real users out of a 15-minute window. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json(rateLimitBody('Too many sign-in attempts — try again in a few minutes')),
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json(rateLimitBody('Too many sign-up attempts — try again later')),
});

/** Refresh is hit by every tab after a 15-minute access token expires, so it gets headroom. */
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json(rateLimitBody('Too many token refreshes — try again shortly')),
});

export const authRoutes = Router();

authRoutes.post('/login', loginLimiter, controller.login);
authRoutes.post('/register', optionalAuth, registerLimiter, controller.register);
authRoutes.post('/refresh', refreshLimiter, controller.refresh);
// Logout stays idempotent and unauthenticated: an expired access token must not block revocation.
authRoutes.post('/logout', optionalAuth, controller.logout);
authRoutes.post('/logout-all', authenticate, controller.logoutAll);
authRoutes.get('/me', authenticate, controller.me);
