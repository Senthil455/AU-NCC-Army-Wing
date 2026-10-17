import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { audit } from '../../common/audit.js';
import { announcementSchema } from './validators.js';

export const announcementRoutes = Router();
announcementRoutes.use(authenticate);

announcementRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const priority = req.query.priority as string | undefined;
    const items = await prisma.announcement.findMany({
      where: { isPublished: true, ...(priority ? { priority: priority as never } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(items);
  }),
);

announcementRoutes.post(
  '/',
  requireRole('OFFICER_ANO_CTO', 'SUPER_ADMIN', 'LEADER_SUO'),
  asyncHandler(async (req, res) => {
    const body = announcementSchema.parse(req.body);
    const row = await prisma.announcement.create({ data: { ...body, publishedBy: req.user!.sub } });
    audit('announcements.create', 'Announcement', { actorId: req.user!.sub, entityId: row.id, ip: req.ip });
    res.status(201).json(row);
  }),
);

announcementRoutes.patch(
  '/:id',
  requireRole('OFFICER_ANO_CTO', 'SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const body = announcementSchema.partial().parse(req.body);
    const row = await prisma.announcement.update({ where: { id: req.params.id }, data: body });
    audit('announcements.update', 'Announcement', { actorId: req.user!.sub, entityId: row.id, ip: req.ip });
    res.json(row);
  }),
);

announcementRoutes.delete(
  '/:id',
  requireRole('OFFICER_ANO_CTO', 'SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    await prisma.announcement.update({ where: { id: z.string().parse(req.params.id) }, data: { isPublished: false } });
    audit('announcements.delete', 'Announcement', { actorId: req.user!.sub, entityId: req.params.id, ip: req.ip });
    res.json({ ok: true });
  }),
);
