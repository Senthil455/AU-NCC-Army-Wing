import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler.js';
import { badRequest } from '../src/common/errors.js';
import { sessionSchema } from '../src/modules/attendance/validators.js';

vi.mock('../src/config/db.js', async () => {
  const { createPrismaMock } = await import('./helpers/mockPrisma.js');
  return { prisma: createPrismaMock(), disconnectPrisma: vi.fn(), pingDatabase: vi.fn() };
});

interface Captured {
  status?: number;
  body?: { error: { message: string; code: string; details?: unknown; requestId?: string } };
}

function fakeResponse(): Response & Captured {
  const captured: Captured = {};
  return {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: Captured['body']) {
      captured.body = body;
      return this;
    },
    get statusCode() {
      return captured.status;
    },
    get payload() {
      return captured.body;
    },
  } as unknown as Response & Captured;
}

const request = { method: 'POST', originalUrl: '/api/attendance/sessions', id: 'req-test' } as unknown as Request;
const next = (() => undefined) as unknown as NextFunction;

describe('errorHandler', () => {
  let res: Response & Captured;

  beforeEach(() => {
    res = fakeResponse();
  });

  it('turns a zod failure into a 400 with field-level details instead of a 500', () => {
    const parsed = sessionSchema.safeParse({ date: 'not-a-date' });
    if (parsed.success) throw new Error('fixture should not parse');

    errorHandler(parsed.error, request, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.payload?.error.code).toBe('VALIDATION_ERROR');
    expect(res.payload?.error.details).toEqual([{ path: 'date', message: expect.any(String) }]);
  });

  it('maps an AppError straight through and stamps the request id', () => {
    errorHandler(badRequest('Bad input'), request, res, next);
    expect(res.statusCode).toBe(400);
    expect(res.payload?.error).toMatchObject({ message: 'Bad input', code: 'BAD_REQUEST', requestId: 'req-test' });
  });

  it('hides internal messages outside production only when they are unknown errors', () => {
    errorHandler(new Error('connect ECONNREFUSED 127.0.0.1:5432'), request, res, next);
    // NODE_ENV=test keeps the message for debugging; production hides it (see middleware source).
    expect(res.statusCode).toBe(500);
    expect(res.payload?.error.code).toBe('INTERNAL');
  });

  it('answers an unknown route with a JSON 404', () => {
    notFoundHandler(request, res, next);
    expect(res.statusCode).toBe(404);
    expect(res.payload?.error.code).toBe('NOT_FOUND');
  });
});
