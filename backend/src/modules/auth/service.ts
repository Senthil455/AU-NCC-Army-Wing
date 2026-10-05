import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { badRequest, unauthorized } from '../../common/errors.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { signAccess, signRefresh, hashToken, verifyRefresh } from '../../utils/jwt.js';

function tokensFor(user: { id: string; role: string; email: string }) {
  const payload = { sub: user.id, role: user.role, email: user.email };
  return { accessToken: signAccess(payload), refreshToken: signRefresh(payload) };
}

export async function login(emailOrRegdNo: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: emailOrRegdNo }, { regdNo: emailOrRegdNo }], isActive: true },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) throw unauthorized('Invalid credentials');
  const tokens = tokensFor(user);
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashToken(tokens.refreshToken), expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 864e5) },
  });
  return { user: safe(user), ...tokens };
}

export async function register(data: { name: string; email: string; password: string; role: string; regdNo?: string }) {
  const exists = await prisma.user.findFirst({ where: { OR: [{ email: data.email }, ...(data.regdNo ? [{ regdNo: data.regdNo }] : [])] } });
  if (exists) throw badRequest('Email or Regd No. already registered');
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, regdNo: data.regdNo, role: data.role as never, passwordHash: await hashPassword(data.password) },
  });
  const tokens = tokensFor(user);
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashToken(tokens.refreshToken), expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 864e5) },
  });
  return { user: safe(user), ...tokens };
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefresh(refreshToken);
  } catch {
    throw unauthorized('Invalid refresh token');
  }
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) throw unauthorized('Refresh token revoked or expired');
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw unauthorized('User inactive');
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  const tokens = tokensFor(user);
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashToken(tokens.refreshToken), expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 864e5) },
  });
  return { user: safe(user), ...tokens };
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(refreshToken) }, data: { revokedAt: new Date() } });
  return { ok: true };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized('User not found');
  return { user: safe(user) };
}

function safe(u: { id: string; name: string; email: string; regdNo: string | null; role: string }) {
  return { id: u.id, name: u.name, email: u.email, regdNo: u.regdNo, role: u.role };
}
