import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/asyncHandler.js';
import { requireUser } from '../../middleware/auth.js';
import * as service from './service.js';
import { announcementFilterSchema, announcementSchema } from './validators.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const filter = announcementFilterSchema.parse(req.query);
  res.json(await service.list(filter));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const body = announcementSchema.parse(req.body);
  res.status(201).json(await service.create(body, requireUser(req), req.ip));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const body = announcementSchema.partial().parse(req.body);
  res.json(await service.update(req.params.id, body, requireUser(req), req.ip));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.remove(req.params.id, requireUser(req), req.ip));
});
