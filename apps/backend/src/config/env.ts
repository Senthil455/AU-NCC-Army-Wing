import dotenv from 'dotenv';
import { z } from 'zod';
import { DEFAULT_LOW_ATTENDANCE_PCT } from '@ncc/shared';

dotenv.config();

/** `z.coerce.boolean()` treats the string "false" as `true`; environments need to be explicit. */
const boolish = (defaultValue: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .default(defaultValue ? 'true' : 'false')
    .transform((v) => v === 'true' || v === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),

  /** Comma-separated browser origins allowed to call the API (CORS allowlist). */
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  /** Enable when the API sits behind a reverse proxy so `req.ip` and rate limiting see the real client. */
  TRUST_PROXY: boolish(false),

  JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().positive().default(7),
  JWT_ISSUER: z.string().default('ncc-api'),
  JWT_AUDIENCE: z.string().default('ncc-portal'),

  ATTENDANCE_LOCK_HOURS: z.coerce.number().nonnegative().default(24),
  LOW_ATTENDANCE_PCT: z.coerce.number().min(0).max(100).default(DEFAULT_LOW_ATTENDANCE_PCT),

  /** Row cap for a single spreadsheet import — keeps a bad upload from pinning the API. */
  BULK_UPLOAD_MAX_ROWS: z.coerce.number().int().positive().default(2000),
  /** Row cap for a single export download. */
  EXPORT_MAX_ROWS: z.coerce.number().int().positive().default(20000),

  /**
   * Public self-registration. OFF by default: an open `/auth/register` is a privilege-escalation
   * hole. Officers create users through `POST /auth/register` with a token; see docs/api.md.
   */
  ALLOW_PUBLIC_REGISTRATION: boolish(false),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}\n\nCopy apps/backend/.env.example to apps/backend/.env and fill it in.`);
}

export const env = parsed.data;
export type Env = typeof env;

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
