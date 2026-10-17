import { PrismaClient } from '@prisma/client';

// Singleton — one pool per process. Never `new PrismaClient()` elsewhere.
export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

/** Readiness probe: is Postgres actually reachable? */
export async function pingDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
