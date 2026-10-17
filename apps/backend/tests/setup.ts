/**
 * Vitest setup: `src/config/env.ts` validates the environment on import, so the tests seed a
 * complete, non-production environment before any module is loaded.
 *
 * `dotenv` never overrides an existing `process.env` value, so whatever a developer has in
 * `apps/backend/.env` cannot change the values asserted here.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://ncc:ncc@localhost:5432/ncc_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-that-is-long-enough-32';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-long-enough-32';
process.env.ALLOW_PUBLIC_REGISTRATION = '0';
process.env.LOW_ATTENDANCE_PCT = '75';
process.env.ATTENDANCE_LOCK_HOURS = '24';
