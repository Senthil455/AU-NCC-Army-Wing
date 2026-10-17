import { z } from 'zod';
import {
  CERTIFICATES,
  ENROLLMENT_STATUSES,
  EXPORTABLE_COLUMNS,
  SORTABLE_CADET_FIELDS,
  SORT_DIRECTIONS,
} from '@ncc/shared';

export const cadetSchema = z.object({
  name: z.string().trim().min(2).max(120),
  regdNo: z.string().trim().min(1).max(40),
  nccRegimentalNo: z.string().trim().min(1).max(40).optional().nullable(),
  rank: z.string().trim().min(1).max(60).default('Cadet'),
  department: z.string().trim().min(1).max(80),
  year: z.coerce.number().int().min(1).max(6),
  batch: z.string().trim().min(1).max(40),
  platoon: z.string().trim().min(1).max(60).default('Alpha'),
  bloodGroup: z.string().trim().min(1).max(8).optional().nullable(),
  phone: z.string().trim().min(4).max(20).optional().nullable(),
  email: z.string().trim().toLowerCase().email().max(200).optional().nullable(),
  parentContact: z.string().trim().min(4).max(20).optional().nullable(),
  address: z.string().trim().min(1).max(400).optional().nullable(),
  photoUrl: z.string().trim().url().max(500).optional().nullable(),
  certificate: z.enum(CERTIFICATES).default('NONE'),
  enrollmentStatus: z.enum(ENROLLMENT_STATUSES).default('ACTIVE'),
  consentGiven: z.boolean().default(false),
  userId: z.string().uuid().optional().nullable(),
});

export const cadetUpdateSchema = cadetSchema.partial();

export const cadetFilterSchema = z.object({
  search: z.string().trim().max(120).optional(),
  department: z.string().trim().max(80).optional(),
  year: z.coerce.number().int().min(1).max(6).optional(),
  rank: z.string().trim().max(60).optional(),
  certificate: z.enum(CERTIFICATES).optional(),
  platoon: z.string().trim().max(60).optional(),
  batch: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
  sort: z.enum(SORTABLE_CADET_FIELDS).optional(),
  order: z.enum(SORT_DIRECTIONS).optional(),
  columns: z.string().trim().max(1000).optional(),
  includeSensitive: z.enum(['true', 'false']).optional(),
});

/** A single spreadsheet row. Cells arrive as text; only these keys are ever written to the DB. */
export const bulkRowSchema = z.object({
  name: z.string().trim().min(2, 'name is required'),
  regdNo: z.string().trim().min(1, 'regdNo is required'),
  nccRegimentalNo: z.string().trim().min(1).max(40).optional(),
  rank: z.string().trim().min(1).max(60).optional(),
  department: z.string().trim().min(1, 'department is required'),
  year: z.coerce.number().int().min(1).max(6),
  batch: z.string().trim().min(1, 'batch is required'),
  platoon: z.string().trim().min(1).max(60).optional(),
  bloodGroup: z.string().trim().min(1).max(8).optional(),
  phone: z.string().trim().min(4).max(20).optional(),
  email: z.string().trim().toLowerCase().email().max(200).optional(),
  parentContact: z.string().trim().min(4).max(20).optional(),
  address: z.string().trim().min(1).max(400).optional(),
  certificate: z.enum(CERTIFICATES).optional(),
  enrollmentStatus: z.enum(ENROLLMENT_STATUSES).optional(),
});

export type CadetInput = z.infer<typeof cadetSchema>;
export type CadetUpdateInput = z.infer<typeof cadetUpdateSchema>;
export type CadetFilter = z.infer<typeof cadetFilterSchema>;
export type BulkRow = z.infer<typeof bulkRowSchema>;

/** Re-exported so the controller can hand a typed column list to the export helpers. */
export { EXPORTABLE_COLUMNS };
