import { vi, type Mock } from 'vitest';

/**
 * The slice of the Prisma client the services touch. Every method is an async spy, so a test can
 * assert on the query a service builds (`expect(db.cadet.findMany).toHaveBeenCalledWith(...)`)
 * without a database. Apply with:
 *
 * ```ts
 * vi.mock('../src/config/db.js', async () => {
 *   const { createPrismaMock } = await import('./helpers/mockPrisma.js');
 *   return { prisma: createPrismaMock(), disconnectPrisma: vi.fn(), pingDatabase: vi.fn() };
 * });
 * ```
 */
export interface PrismaMock {
  user: { findFirst: Mock; findUnique: Mock; create: Mock; updateMany: Mock };
  cadet: {
    findFirst: Mock;
    findUnique: Mock;
    findMany: Mock;
    create: Mock;
    update: Mock;
    count: Mock;
    groupBy: Mock;
    aggregate: Mock;
  };
  refreshToken: { create: Mock; findUnique: Mock; updateMany: Mock };
  attendanceSession: { findUnique: Mock; findMany: Mock; create: Mock; count: Mock };
  attendanceRecord: { upsert: Mock; groupBy: Mock; createMany: Mock };
  announcement: { findMany: Mock; create: Mock; update: Mock };
  newsItem: { findMany: Mock; create: Mock };
  eventCamp: { findMany: Mock; create: Mock };
  auditLog: { create: Mock };
  $transaction: Mock;
}

const asyncMock = () => vi.fn(async (): Promise<unknown> => undefined);

export function createPrismaMock(): PrismaMock {
  return {
    user: {
      findFirst: asyncMock(),
      findUnique: asyncMock(),
      create: asyncMock(),
      updateMany: asyncMock(),
    },
    cadet: {
      findFirst: asyncMock(),
      findUnique: asyncMock(),
      findMany: asyncMock(),
      create: asyncMock(),
      update: asyncMock(),
      count: asyncMock(),
      groupBy: asyncMock(),
      aggregate: asyncMock(),
    },
    refreshToken: { create: asyncMock(), findUnique: asyncMock(), updateMany: asyncMock() },
    attendanceSession: { findUnique: asyncMock(), findMany: asyncMock(), create: asyncMock(), count: asyncMock() },
    attendanceRecord: { upsert: asyncMock(), groupBy: asyncMock(), createMany: asyncMock() },
    announcement: { findMany: asyncMock(), create: asyncMock(), update: asyncMock() },
    newsItem: { findMany: asyncMock(), create: asyncMock() },
    eventCamp: { findMany: asyncMock(), create: asyncMock() },
    // `audit()` chains `.catch()` on the returned promise, so this one must always resolve.
    auditLog: { create: vi.fn(async (): Promise<unknown> => ({})) },
    // Interactive-transaction form passes a callback; batch form passes an array of queries.
    $transaction: vi.fn(async (input: unknown) => (Array.isArray(input) ? Promise.all(input) : input)),
  };
}
