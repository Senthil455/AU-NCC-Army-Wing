import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@ncc/shared';
import { forbidden, unauthorized } from '../common/errors.js';
import { verifyAccess, type TokenPayload } from '../utils/jwt.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by `authenticate`; typed accessor is `requireUser()`. */
      user?: TokenPayload;
    }
  }
}

/** Reject the request unless it carries a valid, unexpired access token. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(unauthorized('Missing bearer token'));
  try {
    req.user = verifyAccess(header.slice(7));
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}

/**
 * Attach `req.user` when a valid token is present, but let anonymous callers through.
 * Used by endpoints that behave differently for staff and the public (`POST /auth/register`).
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccess(header.slice(7));
    } catch {
      // Anonymous is a valid state here; a broken token must not 401 the whole endpoint.
    }
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden(`Requires one of: ${roles.join(', ')}`));
    next();
  };
}

export const requireOfficer = requireRole('OFFICER_ANO_CTO', 'SUPER_ADMIN');
export const requireStaff = requireRole('SUPER_ADMIN', 'OFFICER_ANO_CTO', 'LEADER_SUO');

/** Controller-side accessor: `req.user!` hid a missing-auth bug behind a non-null assertion. */
export function requireUser(req: Request): TokenPayload {
  if (!req.user) throw unauthorized();
  return req.user;
}
