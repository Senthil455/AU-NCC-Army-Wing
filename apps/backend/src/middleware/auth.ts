import { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../common/errors.js';
import { verifyAccess, TokenPayload } from '../utils/jwt.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(unauthorized('Missing bearer token'));
  try {
    req.user = verifyAccess(header.slice(7));
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) {
      const err = new Error('Forbidden: insufficient role') as Error & { status?: number; code?: string };
      err.status = 403;
      err.code = 'FORBIDDEN';
      return next(err);
    }
    next();
  };
}
