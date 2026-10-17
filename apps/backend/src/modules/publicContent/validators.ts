import { z } from 'zod';

const isoDate = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Use an ISO date, e.g. 2026-03-01');

export const newsSchema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(1).max(5000),
});

export const eventSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(1).max(5000),
    type: z.string().trim().min(2).max(40).default('CAMP'),
    startsAt: isoDate,
    endsAt: isoDate.optional().nullable(),
    venue: z.string().trim().min(1).max(160).optional().nullable(),
  })
  .refine((value) => !value.endsAt || Date.parse(value.endsAt) >= Date.parse(value.startsAt), {
    message: '"endsAt" must not be before "startsAt"',
  });

export type NewsInput = z.infer<typeof newsSchema>;
export type EventInput = z.infer<typeof eventSchema>;
