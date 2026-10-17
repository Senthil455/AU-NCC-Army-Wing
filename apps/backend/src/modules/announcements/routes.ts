import { Router } from 'express';
import { authenticate, requireOfficer, requireStaff } from '../../middleware/auth.js';
import * as controller from './controller.js';

export const announcementRoutes = Router();

/**
 * The board itself is public: these are official notices that the unit also shows on the public
 * home page. Only publishing, editing and unpublishing require a staff login.
 */
announcementRoutes.get('/', controller.list);

announcementRoutes.post('/', authenticate, requireStaff, controller.create);
announcementRoutes.patch('/:id', authenticate, requireOfficer, controller.update);
announcementRoutes.delete('/:id', authenticate, requireOfficer, controller.remove);
