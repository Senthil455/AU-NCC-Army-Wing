import { z } from 'zod';

export const announcementSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(1),
  priority: z.enum(['URGENT', 'GENERAL']).default('GENERAL'),
  attachmentUrl: z.string().url().optional().nullable(),
});
