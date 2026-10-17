import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/db.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../common/asyncHandler.js';

export const publicContentRoutes = Router();

publicContentRoutes.get(
  '/news',
  asyncHandler(async (_req, res) => {
    res.json(await prisma.newsItem.findMany({ orderBy: { date: 'desc' }, take: 50 }));
  }),
);

publicContentRoutes.get(
  '/events',
  asyncHandler(async (_req, res) => {
    res.json(await prisma.eventCamp.findMany({ orderBy: { startsAt: 'asc' }, take: 50 }));
  }),
);

publicContentRoutes.post(
  '/news',
  authenticate,
  requireRole('OFFICER_ANO_CTO', 'SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const body = z.object({ title: z.string().min(3), body: z.string().min(1) }).parse(req.body);
    res.status(201).json(await prisma.newsItem.create({ data: body }));
  }),
);

publicContentRoutes.post(
  '/events',
  authenticate,
  requireRole('OFFICER_ANO_CTO', 'SUPER_ADMIN'),
  asyncHandler(async (req, res) => {
    const body = z.object({ title: z.string().min(3), description: z.string().min(1), startsAt: z.string(), venue: z.string().optional() }).parse(req.body);
    res.status(201).json(await prisma.eventCamp.create({ data: { ...body, startsAt: new Date(body.startsAt) } }));
  }),
);
