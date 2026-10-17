import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().default(7),
  ATTENDANCE_LOCK_HOURS: z.coerce.number().default(24),
  LOW_ATTENDANCE_PCT: z.coerce.number().default(75),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
