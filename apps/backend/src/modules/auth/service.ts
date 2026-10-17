import { DEFAULT_ROLE, isOfficer, type Role } from '@ncc/shared';
import { env } from '../../config/env.js';
import { prisma } from '../../config/db.js';
import { audit } from '../../common/audit.js';
import { conflict, forbidden, unauthorized } from '../../common/errors.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { hashToken, refreshExpiry, signAccess, signRefresh, verifyRefresh } from '../../utils/jwt.js';
import type { RegisterInput } from './validators.js';

interface UserRow {
  id: string;
  name: string;
  email: string;
  regdNo: string | null;
  role: Role;
}

export interface AuthResult {
  user: { id: string; name: string; email: string; regdNo: string | null; role: Role };
  accessToken: string;
  refreshToken: string;
}

function safe(user: UserRow) {
  return { id: user.id, name: user.name, email: user.email, regdNo: user.regdNo, role: user.role };
}

function tokensFor(user: UserRow) {
  const payload = { sub: user.id, role: user.role, email: user.email };
  return { accessToken: signAccess(payload), refreshToken: signRefresh(payload) };
}

async function issueSession(user: UserRow): Promise<AuthResult> {
  const tokens = tokensFor(user);
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashToken(tokens.refreshToken), expiresAt: refreshExpiry() },
  });
  return { user: safe(user), ...tokens };
}

async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function login(emailOrRegdNo: string, password: string, ip?: string): Promise<AuthResult> {
  const lookup = emailOrRegdNo.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: lookup }, { regdNo: emailOrRegdNo }], isActive: true },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    audit('auth.login.failed', 'User', { meta: { identifier: lookup }, ip });
    throw unauthorized('Invalid credentials');
  }

  audit('auth.login', 'User', { actorId: user.id, actorRole: user.role, ip });
  return issueSession(user);
}

/**
 * Registration.
 *
 * Without a token this is self-service CADET signup, and only when the deployment explicitly
 * opts in (`ALLOW_PUBLIC_REGISTRATION`). Previously the endpoint was open to the internet and
 * honoured `role` straight from the body — anyone could mint themselves a `SUPER_ADMIN`.
 */
export async function register(
  data: RegisterInput,
  actor?: { sub: string; role: Role },
  ip?: string,
): Promise<AuthResult> {
  if (!actor && !env.ALLOW_PUBLIC_REGISTRATION) {
    throw forbidden('Public sign-up is disabled — ask an officer to create your account');
  }

  const wantsElevatedRole = data.role !== DEFAULT_ROLE;
  if (wantsElevatedRole) {
    if (!actor || !isOfficer(actor.role)) throw forbidden('Only an officer can create staff accounts');
    if (data.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN') {
      throw forbidden('Only a super admin can create another super admin');
    }
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, ...(data.regdNo ? [{ regdNo: data.regdNo }] : [])] },
    select: { email: true, regdNo: true },
  });
  if (existing) {
    throw conflict(existing.email === data.email ? 'Email is already registered' : 'Register number is already registered');
  }

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      regdNo: data.regdNo ?? null,
      role: data.role,
      passwordHash: await hashPassword(data.password),
    },
  });

  audit('auth.register', 'User', {
    actorId: actor?.sub ?? user.id,
    actorRole: actor?.role ?? user.role,
    entityId: user.id,
    meta: { role: user.role, selfService: !actor },
    ip,
  });

  return issueSession(user);
}

/**
 * Rotate a refresh token.
 *
 * Rotation is atomic, so two requests racing with the same token cannot both mint a session, and
 * replaying an already-rotated token is treated as theft: every session for that user is revoked.
 */
export async function refresh(refreshToken: string, ip?: string): Promise<AuthResult> {
  let payload;
  try {
    payload = verifyRefresh(refreshToken);
  } catch {
    throw unauthorized('Invalid refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
  if (!stored || stored.userId !== payload.sub) throw unauthorized('Refresh token not recognised');

  if (stored.revokedAt) {
    await revokeAllSessions(stored.userId);
    audit('auth.refresh.reuse-detected', 'User', { actorId: stored.userId, ip });
    throw unauthorized('Refresh token was already used — all sessions have been revoked');
  }

  if (stored.expiresAt < new Date()) throw unauthorized('Refresh token expired');

  const rotated = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (rotated.count === 0) {
    await revokeAllSessions(stored.userId);
    audit('auth.refresh.reuse-detected', 'User', { actorId: stored.userId, ip });
    throw unauthorized('Refresh token was already used — all sessions have been revoked');
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || !user.isActive) throw unauthorized('User inactive');

  return issueSession(user);
}

export async function logout(refreshToken: string, actorId?: string, ip?: string): Promise<{ ok: true }> {
  const revoked = await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (revoked.count > 0) audit('auth.logout', 'User', { actorId, ip });
  return { ok: true };
}

/** DPDP breach drill: kill every session belonging to the caller. */
export async function logoutAll(userId: string, ip?: string): Promise<{ ok: true; revoked: number }> {
  const revoked = await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  audit('auth.logout-all', 'User', { actorId: userId, meta: { revoked: revoked.count }, ip });
  return { ok: true, revoked: revoked.count };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw unauthorized('User not found');
  return { user: safe(user) };
}
