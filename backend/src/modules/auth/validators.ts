import { z } from 'zod';

export const loginSchema = z.object({
  emailOrRegdNo: z.string().min(1),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['SUPER_ADMIN', 'OFFICER_ANO_CTO', 'LEADER_SUO', 'CADET']).default('CADET'),
  regdNo: z.string().optional(),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
