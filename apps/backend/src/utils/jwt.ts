import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { isRole, type Role } from '@ncc/shared';
import { env } from '../config/env.js';
import { unauthorized } from '../common/errors.js';

export interface TokenPayload {
  sub: string;
  role: Role;
  email: string;
}

const ALGORITHM = 'HS256' as const;

function sign(payload: TokenPayload, secret: string, expiresIn: string): string {
  const options = {
    algorithm: ALGORITHM,
    expiresIn,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  } as jwt.SignOptions;
  return jwt.sign(payload, secret, options);
}

export const signAccess = (payload: TokenPayload): string =>
  sign(payload, env.JWT_ACCESS_SECRET, env.JWT_ACCESS_TTL);

export const signRefresh = (payload: TokenPayload): string =>
  sign(payload, env.JWT_REFRESH_SECRET, `${env.JWT_REFRESH_TTL_DAYS}d`);

/**
 * The algorithm, issuer and audience are pinned, and the payload is re-validated: an
 * unsigned/foreign token used to be cast to `TokenPayload` without checking its shape.
 */
function verify(token: string, secret: string): TokenPayload {
  const decoded = jwt.verify(token, secret, {
    algorithms: [ALGORITHM],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
  if (typeof decoded !== 'object' || decoded === null) throw unauthorized('Malformed token');

  const { sub, role, email } = decoded as jwt.JwtPayload & Partial<TokenPayload>;
  if (typeof sub !== 'string' || typeof email !== 'string' || !isRole(role)) {
    throw unauthorized('Malformed token payload');
  }
  return { sub, role, email };
}

export const verifyAccess = (token: string): TokenPayload => verify(token, env.JWT_ACCESS_SECRET);
export const verifyRefresh = (token: string): TokenPayload => verify(token, env.JWT_REFRESH_SECRET);

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshExpiry(): Date {
  return new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 86_400_000);
}
