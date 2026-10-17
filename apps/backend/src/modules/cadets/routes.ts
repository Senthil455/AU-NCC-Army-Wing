import { Router } from 'express';
import { authenticate, requireOfficer, requireRole, requireStaff } from '../../middleware/auth.js';
import * as controller from './controller.js';
import { upload } from './controller.js';

export const cadetRoutes = Router();

cadetRoutes.use(authenticate);

/**
 * Read routes are staff-only. Any authenticated user used to be able to page through the whole
 * cadet database (`GET /cadets`) — a cadet may only ever read their own record via `/cadets/me`.
 */
cadetRoutes.get('/me', controller.getMe);
cadetRoutes.get('/template', requireStaff, controller.template);
cadetRoutes.get('/export.xlsx', requireStaff, controller.exportXlsx);
cadetRoutes.get('/export.csv', requireStaff, controller.exportCsv);
cadetRoutes.get('/export.pdf', requireStaff, controller.exportPdf);

cadetRoutes.post('/bulk-upload', requireOfficer, upload.single('file'), controller.bulkUpload);

cadetRoutes.get('/', requireStaff, controller.list);
cadetRoutes.get('/:id', requireStaff, controller.getOne);
cadetRoutes.post('/', requireOfficer, controller.create);
cadetRoutes.patch('/:id', requireOfficer, controller.update);
cadetRoutes.delete('/:id', requireRole('SUPER_ADMIN'), controller.remove);
