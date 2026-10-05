import { z } from 'zod';

export const cadetSchema = z.object({
  name: z.string().min(2),
  regdNo: z.string().min(1),
  nccRegimentalNo: z.string().optional().nullable(),
  rank: z.string().default('Cadet'),
  department: z.string().min(1),
  year: z.coerce.number().int().min(1).max(5),
  batch: z.string().min(1),
  platoon: z.string().default('Alpha'),
  bloodGroup: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  parentContact: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  certificate: z.enum(['NONE', 'A', 'B', 'C']).default('NONE'),
  enrollmentStatus: z.enum(['APPLIED', 'SHORTLISTED', 'SELECTED', 'ACTIVE', 'EXITED']).default('ACTIVE'),
  consentGiven: z.boolean().default(false),
  userId: z.string().uuid().optional().nullable(),
});

export const cadetUpdateSchema = cadetSchema.partial();

export const cadetFilterSchema = z.object({
  search: z.string().optional(),
  department: z.string().optional(),
  year: z.coerce.number().optional(),
  rank: z.string().optional(),
  certificate: z.enum(['NONE', 'A', 'B', 'C']).optional(),
  platoon: z.string().optional(),
  batch: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
  sort: z.string().default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

// Whitelist for ?columns= — contract-first exports (see ARCHITECTURE.md)
export const EXPORTABLE_COLUMNS = [
  'name', 'regdNo', 'nccRegimentalNo', 'rank', 'department', 'year', 'batch', 'platoon',
  'bloodGroup', 'phone', 'email', 'parentContact', 'certificate', 'attendancePct',
] as const;

export const SENSITIVE_COLUMNS = ['phone', 'parentContact', 'email'];
