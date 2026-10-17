import { Router } from 'express';
import { announcementRoutes } from '../modules/announcements/routes.js';
import { attendanceRoutes } from '../modules/attendance/routes.js';
import { authRoutes } from '../modules/auth/routes.js';
import { cadetRoutes } from '../modules/cadets/routes.js';
import { dashboardRoutes } from '../modules/dashboard/routes.js';
import { healthRoutes } from '../modules/health/routes.js';
import { publicContentRoutes } from '../modules/publicContent/routes.js';

export const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/cadets', cadetRoutes);
apiRouter.use('/attendance', attendanceRoutes);
apiRouter.use('/announcements', announcementRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
// Mounted last: `/news` and `/events` live at the API root.
apiRouter.use('/', publicContentRoutes);
