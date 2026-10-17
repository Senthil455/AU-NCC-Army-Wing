import { Router } from 'express';
import { authenticate, requireStaff } from '../../middleware/auth.js';
import * as controller from './controller.js';

export const attendanceRoutes = Router();

attendanceRoutes.use(authenticate);

/**
 * Every attendance route is staff-only. `GET /sessions`, `GET /report` and the report downloads
 * used to be reachable with any valid token, so any cadet could read the whole wing's attendance.
 */
attendanceRoutes.get('/sessions', requireStaff, controller.listSessions);
attendanceRoutes.post('/sessions', requireStaff, controller.createSession);
attendanceRoutes.get('/sessions/:id', requireStaff, controller.getSession);
attendanceRoutes.post('/sessions/:id/mark', requireStaff, controller.mark);

attendanceRoutes.get('/report', requireStaff, controller.report);
attendanceRoutes.get('/report.xlsx', requireStaff, controller.reportXlsx);
attendanceRoutes.get('/report.pdf', requireStaff, controller.reportPdf);
