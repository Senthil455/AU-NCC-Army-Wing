import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/asyncHandler.js';
import { requireUser } from '../../middleware/auth.js';
import * as service from './service.js';
import { eventSchema, newsSchema } from './validators.js';

const limit = (value: unknown, fallback: number) => {
  const parsed = parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : fallback;
};

export const listNews = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listNews(limit(req.query.limit, 50)));
});

export const listEvents = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.listEvents(limit(req.query.limit, 50)));
});

export const createNews = asyncHandler(async (req: Request, res: Response) => {
  const body = newsSchema.parse(req.body);
  res.status(201).json(await service.createNews(body, requireUser(req), req.ip));
});

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const body = eventSchema.parse(req.body);
  res.status(201).json(await service.createEvent(body, requireUser(req), req.ip));
});
