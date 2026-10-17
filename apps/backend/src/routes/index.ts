import { Router } from 'express';
import { authRoutes } from '../modules/auth/routes.js';
import { cadetRoutes } from '../modules/cadets/routes.js';
import { attendanceRoutes } from '../modules/attendance/routes.js';
import { announcementRoutes } from '../modules/announcements/routes.js';
import { dashboardRoutes } from '../modules/dashboard/routes.js';
import { publicContentRoutes } from '../modules/publicContent/routes.js';

export const apiRouter = Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/cadets', cadetRoutes);
apiRouter.use('/attendance', attendanceRoutes);
apiRouter.use('/announcements', announcementRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/', publicContentRoutes); // /news, /events (public GET)
apiRouter.get('/health', (_req, res) => res.json({ ok: true }));
