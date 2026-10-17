import { Router } from 'express';
import { authenticate, requireOfficer, requireStaff } from '../../middleware/auth.js';
import * as controller from './controller.js';

export const announcementRoutes = Router();

announcementRoutes.use(authenticate);

announcementRoutes.get('/', controller.list);
announcementRoutes.post('/', requireStaff, controller.create);
announcementRoutes.patch('/:id', requireOfficer, controller.update);
announcementRoutes.delete('/:id', requireOfficer, controller.remove);
