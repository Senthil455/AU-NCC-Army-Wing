import { NextFunction, Request, Response } from 'express';

export function errorHandler(err: Error & { status?: number; code?: string; details?: unknown }, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: { message: err.message || 'Internal error', code: err.code ?? 'INTERNAL', details: err.details } });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { message: 'Route not found', code: 'NOT_FOUND' } });
}
