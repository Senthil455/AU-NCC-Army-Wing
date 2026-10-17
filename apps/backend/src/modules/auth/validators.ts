import { z } from 'zod';
import { ROLES } from '@ncc/shared';

export const loginSchema = z.object({
  emailOrRegdNo: z.string().trim().min(1, 'Email or register number is required').max(200),
  password: z.string().min(1, 'Password is required').max(200),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  // bcrypt only reads the first 72 bytes — cap it instead of silently truncating.
  password: z.string().min(8, 'Use at least 8 characters').max(72),
  role: z.enum(ROLES).default('CADET'),
  regdNo: z.string().trim().min(1).max(40).optional(),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(1).max(4096) });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
