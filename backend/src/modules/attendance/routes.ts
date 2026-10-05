import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import * as c from './controller.js';

export const attendanceRoutes = Router();
attendanceRoutes.use(authenticate);
attendanceRoutes.get('/sessions', c.listSessions);
attendanceRoutes.post('/sessions', requireRole('OFFICER_ANO_CTO', 'SUPER_ADMIN', 'LEADER_SUO'), c.createSession);
attendanceRoutes.get('/sessions/:id', c.getSession);
attendanceRoutes.post('/sessions/:id/mark', requireRole('OFFICER_ANO_CTO', 'SUPER_ADMIN', 'LEADER_SUO'), c.mark);
attendanceRoutes.get('/report', c.report);
attendanceRoutes.get('/report.xlsx', c.reportXlsx);
attendanceRoutes.get('/report.pdf', c.reportPdf);
