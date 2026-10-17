import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loginSchema, registerSchema } from '../src/modules/auth/validators.js';
import { register } from '../src/modules/auth/service.js';
import { prisma } from '../src/config/db.js';
import type { PrismaMock } from './helpers/mockPrisma.js';

vi.mock('../src/config/db.js', async () => {
  const { createPrismaMock } = await import('./helpers/mockPrisma.js');
  return { prisma: createPrismaMock(), disconnectPrisma: vi.fn(), pingDatabase: vi.fn() };
});

const db = prisma as unknown as PrismaMock;

describe('auth validators', () => {
  it('accepts an AU email or a register number as the login identifier', () => {
    expect(loginSchema.parse({ emailOrRegdNo: 'ano@annauniv.edu', password: 'x' }).emailOrRegdNo).toBe('ano@annauniv.edu');
    expect(loginSchema.parse({ emailOrRegdNo: '2023CS001', password: 'x' }).emailOrRegdNo).toBe('2023CS001');
  });

  it('rejects an empty password', () => {
    expect(() => loginSchema.parse({ emailOrRegdNo: 'a', password: '' })).toThrow();
  });

  it('defaults a new registration to CADET', () => {
    const parsed = registerSchema.parse({ name: 'New Cadet', email: 'NEW@AnnaUniv.edu', password: 'Passw0rd!' });
    expect(parsed.role).toBe('CADET');
    expect(parsed.email).toBe('new@annauniv.edu');
  });

  it("caps the password at bcrypt's 72-byte limit instead of silently truncating it", () => {
    expect(() =>
      registerSchema.parse({ name: 'New Cadet', email: 'a@b.com', password: 'a'.repeat(73) }),
    ).toThrow();
  });
});

describe('POST /auth/register authorization', () => {
  const cadetSignup = { name: 'New Cadet', email: 'new@annauniv.edu', password: 'Passw0rd!', role: 'CADET' as const };
  const officer = { sub: 'user-officer', role: 'OFFICER_ANO_CTO' as const };

  beforeEach(() => {
    db.user.findFirst.mockResolvedValue(null);
    db.user.create.mockResolvedValue({
      id: 'user-new',
      name: 'New Cadet',
      email: 'new@annauniv.edu',
      regdNo: null,
      role: 'CADET',
      isActive: true,
    });
    db.refreshToken.create.mockResolvedValue({});
  });

  it('refuses public self-service signup unless the deployment opts in', async () => {
    await expect(register(cadetSignup)).rejects.toMatchObject({ status: 403 });
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it('refuses a role taken from the request body when the caller is anonymous', async () => {
    // Regression: this used to mint a SUPER_ADMIN for any anonymous POST.
    await expect(register({ ...cadetSignup, role: 'SUPER_ADMIN' })).rejects.toMatchObject({ status: 403 });
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it('lets an officer create staff accounts', async () => {
    db.user.create.mockResolvedValue({
      id: 'user-leader',
      name: 'Senior Under Officer',
      email: 'suo@annauniv.edu',
      regdNo: null,
      role: 'LEADER_SUO',
      isActive: true,
    });

    const result = await register(
      { name: 'Senior Under Officer', email: 'suo@annauniv.edu', password: 'Passw0rd!', role: 'LEADER_SUO' },
      officer,
    );

    expect(result.user.role).toBe('LEADER_SUO');
    expect(result.accessToken).toBeTruthy();
    expect(db.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('reserves SUPER_ADMIN creation for a super admin', async () => {
    await expect(register({ ...cadetSignup, role: 'SUPER_ADMIN' }, officer)).rejects.toMatchObject({ status: 403 });
  });

  it('reports a duplicate email as a conflict', async () => {
    db.user.findFirst.mockResolvedValue({ email: cadetSignup.email, regdNo: null });
    await expect(register(cadetSignup, officer)).rejects.toMatchObject({ status: 409 });
  });
});
