import { PrismaClient } from '@prisma/client';

// Singleton — one pool per process. Never `new PrismaClient()` elsewhere.
export const prisma = new PrismaClient();
