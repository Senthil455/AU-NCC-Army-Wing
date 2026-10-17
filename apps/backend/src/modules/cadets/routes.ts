import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import * as c from './controller.js';
import { upload } from './controller.js';

export const cadetRoutes = Router();
cadetRoutes.use(authenticate);

cadetRoutes.get('/me', c.getMe);
cadetRoutes.get('/template', requireRole('OFFICER_ANO_CTO', 'SUPER_ADMIN', 'LEADER_SUO'), c.template);
cadetRoutes.get('/export.xlsx', requireRole('OFFICER_ANO_CTO', 'SUPER_ADMIN', 'LEADER_SUO'), c.exportXlsx);
cadetRoutes.get('/export.csv', requireRole('OFFICER_ANO_CTO', 'SUPER_ADMIN', 'LEADER_SUO'), c.exportCsv);
cadetRoutes.get('/export.pdf', requireRole('OFFICER_ANO_CTO', 'SUPER_ADMIN', 'LEADER_SUO'), c.exportPdf);
cadetRoutes.post('/bulk-upload', requireRole('OFFICER_ANO_CTO', 'SUPER_ADMIN'), upload.single('file'), c.bulkUpload);

cadetRoutes.get('/', c.list);
cadetRoutes.get('/:id', c.getOne);
cadetRoutes.post('/', requireRole('OFFICER_ANO_CTO', 'SUPER_ADMIN'), c.create);
cadetRoutes.patch('/:id', requireRole('OFFICER_ANO_CTO', 'SUPER_ADMIN'), c.update);
cadetRoutes.delete('/:id', requireRole('SUPER_ADMIN'), c.remove);
