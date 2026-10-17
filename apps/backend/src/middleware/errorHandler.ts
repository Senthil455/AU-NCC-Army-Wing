import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import type { ApiErrorBody, ApiErrorCode } from '@ncc/shared';
import { isProduction } from '../config/env.js';
import { isAppError } from '../common/errors.js';

interface ErrorPayload {
  status: number;
  message: string;
  code: ApiErrorCode;
  details?: unknown;
}

/**
 * Single place where every thrown value becomes an HTTP response.
 *
 * Three classes of bug used to leak out of here as 500s: zod validation failures, Prisma
 * "record not found"/unique violations, and internal messages in production.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const payload = toPayload(err);

  if (payload.status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl} (${req.id})`, err);
  }

  const body: ApiErrorBody & { error: { requestId?: string } } = {
    error: {
      message: payload.message,
      code: payload.code,
      details: payload.details,
      requestId: req.id,
    },
  };
  res.status(payload.status).json(body);
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { message: 'Route not found', code: 'NOT_FOUND' } });
}

function toPayload(err: unknown): ErrorPayload {
  if (err instanceof ZodError) {
    return {
      status: 400,
      message: 'Request validation failed',
      code: 'VALIDATION_ERROR',
      details: err.issues.map((issue) => ({ path: issue.path.join('.') || '(root)', message: issue.message })),
    };
  }

  if (isAppError(err)) {
    return { status: err.status, message: err.message, code: err.code, details: err.details };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return prismaPayload(err);
  }

  // express.json() rejects malformed bodies with a SyntaxError carrying `body`.
  if (err instanceof SyntaxError && 'body' in err) {
    return { status: 400, message: 'Malformed JSON body', code: 'BAD_REQUEST' };
  }

  if (isMulterLimitError(err)) {
    return { status: 400, message: 'Uploaded file is too large', code: 'BAD_REQUEST' };
  }

  const message = err instanceof Error && err.message ? err.message : 'Internal error';
  return {
    status: 500,
    // Internal messages (stack-adjacent details, SQL fragments) stay server-side in production.
    message: isProduction ? 'Internal error' : message,
    code: 'INTERNAL',
  };
}

function prismaPayload(err: Prisma.PrismaClientKnownRequestError): ErrorPayload {
  const target = Array.isArray(err.meta?.target) ? (err.meta?.target as string[]).join(', ') : undefined;
  switch (err.code) {
    case 'P2002':
      return { status: 409, message: target ? `Already exists (${target})` : 'Record already exists', code: 'CONFLICT', details: { target } };
    case 'P2025':
      return { status: 404, message: 'Record not found', code: 'NOT_FOUND' };
    case 'P2003':
      return { status: 400, message: 'Referenced record does not exist', code: 'BAD_REQUEST', details: { field: err.meta?.field_name } };
    default:
      return { status: 500, message: `Database error (${err.code})`, code: 'INTERNAL' };
  }
}

function isMulterLimitError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'LIMIT_FILE_SIZE';
}
