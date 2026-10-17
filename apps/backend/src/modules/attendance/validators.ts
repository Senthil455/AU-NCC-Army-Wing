import { z } from 'zod';
import { ATTENDANCE_STATUSES, SESSION_TYPES } from '@ncc/shared';

/** Accepts an ISO date or date-time; rejects the "Invalid Date" that used to reach Prisma. */
const isoDate = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Use an ISO date, e.g. 2026-02-14');

const platoon = z.string().trim().min(1).max(60);

export const sessionSchema = z.object({
  date: isoDate,
  type: z.enum(SESSION_TYPES).default('DRILL'),
  platoon: platoon.optional(),
  location: z.string().trim().min(1).max(120).optional(),
});

export const sessionFilterSchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  type: z.enum(SESSION_TYPES).optional(),
  platoon: platoon.optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export const markSchema = z
  .object({
    markAllPresent: z.boolean().optional(),
    records: z
      .array(
        z.object({
          cadetId: z.string().uuid(),
          status: z.enum(ATTENDANCE_STATUSES),
          note: z.string().trim().max(200).optional(),
        }),
      )
      .max(1000)
      .default([]),
  })
  .refine((value) => value.markAllPresent === true || value.records.length > 0, {
    message: 'Send at least one record or set markAllPresent=true',
  });

export const reportFilterSchema = z
  .object({
    from: isoDate.optional(),
    to: isoDate.optional(),
    platoon: platoon.optional(),
    cadetId: z.string().uuid().optional(),
  })
  .refine(
    (value) => !value.from || !value.to || Date.parse(value.from) <= Date.parse(value.to),
    { message: '"from" must not be after "to"' },
  );

export type SessionInput = z.infer<typeof sessionSchema>;
export type SessionFilter = z.infer<typeof sessionFilterSchema>;
export type MarkInput = z.infer<typeof markSchema>;
export type ReportFilter = z.infer<typeof reportFilterSchema>;
