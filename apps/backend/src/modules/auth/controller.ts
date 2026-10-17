import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/asyncHandler.js';
import { requireUser } from '../../middleware/auth.js';
import * as service from './service.js';
import { loginSchema, refreshSchema, registerSchema } from './validators.js';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);
  res.json(await service.login(body.emailOrRegdNo, body.password, req.ip));
});

/**
 * Self-service signup (when `ALLOW_PUBLIC_REGISTRATION=true`) or an officer inviting staff.
 * A valid officer token in the Authorization header is optional, never required.
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);
  res.status(201).json(await service.register(body, req.user, req.ip));
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const body = refreshSchema.parse(req.body);
  res.json(await service.refresh(body.refreshToken, req.ip));
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const body = refreshSchema.parse(req.body);
  res.json(await service.logout(body.refreshToken, req.user?.sub, req.ip));
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  res.json(await service.logoutAll(user.sub, req.ip));
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  res.json(await service.me(user.sub));
});
