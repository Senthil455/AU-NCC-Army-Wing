import { Router } from 'express';
import { authenticate, requireOfficer } from '../../middleware/auth.js';
import * as controller from './controller.js';

/** `/news` and `/events`: world-readable, officer-writable. Mounted at the API root. */
export const publicContentRoutes = Router();

publicContentRoutes.get('/news', controller.listNews);
publicContentRoutes.post('/news', authenticate, requireOfficer, controller.createNews);

publicContentRoutes.get('/events', controller.listEvents);
publicContentRoutes.post('/events', authenticate, requireOfficer, controller.createEvent);
