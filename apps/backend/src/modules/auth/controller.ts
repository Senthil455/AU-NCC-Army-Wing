import { Request, Response } from 'express';
import { asyncHandler } from '../../common/asyncHandler.js';
import * as service from './service.js';
import { loginSchema, registerSchema, refreshSchema } from './validators.js';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);
  res.json(await service.login(body.emailOrRegdNo, body.password));
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);
  res.status(201).json(await service.register(body));
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const body = refreshSchema.parse(req.body);
  res.json(await service.refresh(body.refreshToken));
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const body = refreshSchema.parse(req.body);
  res.json(await service.logout(body.refreshToken));
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.me(req.user!.sub));
});
