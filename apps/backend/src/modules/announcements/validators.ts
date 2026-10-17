import { z } from 'zod';
import { ANNOUNCEMENT_PRIORITIES } from '@ncc/shared';

export const announcementSchema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(1).max(5000),
  priority: z.enum(ANNOUNCEMENT_PRIORITIES).default('GENERAL'),
  attachmentUrl: z.string().trim().url().max(500).optional().nullable(),
  isPublished: z.boolean().optional(),
});

export const announcementFilterSchema = z.object({
  // Was cast straight into a Prisma enum, so `?priority=nonsense` returned a 500.
  priority: z.enum(ANNOUNCEMENT_PRIORITIES).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;
export type AnnouncementFilter = z.infer<typeof announcementFilterSchema>;
