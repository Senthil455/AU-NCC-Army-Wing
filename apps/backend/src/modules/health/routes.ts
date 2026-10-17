import { Router } from 'express';
import type { HealthResponse } from '@ncc/shared';
import { asyncHandler } from '../../common/asyncHandler.js';
import { pingDatabase } from '../../config/db.js';

export const healthRoutes = Router();

/** Liveness: the process is serving. No auth and no database dependency. */
healthRoutes.get('/', (_req, res) => {
  const body: HealthResponse = { ok: true, uptimeSeconds: Math.round(process.uptime()) };
  res.json(body);
});

/** Readiness: answers 503 when Postgres is unreachable, so a load balancer can route around it. */
healthRoutes.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    const dbUp = await pingDatabase();
    const body: HealthResponse = { ok: dbUp, db: dbUp ? 'up' : 'down' };
    res.status(dbUp ? 200 : 503).json(body);
  }),
);
