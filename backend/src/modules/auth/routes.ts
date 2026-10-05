import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from './controller.js';
import { authenticate } from '../../middleware/auth.js';

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });

export const authRoutes = Router();
authRoutes.post('/login', limiter, controller.login);
authRoutes.post('/register', limiter, controller.register);
authRoutes.post('/refresh', controller.refresh);
authRoutes.post('/logout', controller.logout);
authRoutes.get('/me', authenticate, controller.me);
