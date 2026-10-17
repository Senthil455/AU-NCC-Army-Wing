import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/asyncHandler.js';
import { requireUser } from '../../middleware/auth.js';
import * as service from './service.js';

export const summary = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.summary(requireUser(req)));
});
