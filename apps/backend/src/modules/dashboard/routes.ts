import { Router } from 'express';
import { authenticate, requireStaff } from '../../middleware/auth.js';
import * as controller from './controller.js';

export const dashboardRoutes = Router();

dashboardRoutes.use(authenticate, requireStaff);
dashboardRoutes.get('/summary', controller.summary);
