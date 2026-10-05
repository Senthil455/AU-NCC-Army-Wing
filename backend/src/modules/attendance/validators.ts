import { z } from 'zod';

export const sessionSchema = z.object({
  date: z.string().min(1),
  type: z.enum(['DRILL', 'WEAPON_TRAINING', 'MAP_READING', 'PHYSICAL_TRAINING', 'SOCIAL_SERVICE', 'CLASS', 'OTHER']).default('DRILL'),
  platoon: z.string().optional(),
  location: z.string().optional(),
});

export const markSchema = z.object({
  markAllPresent: z.boolean().optional(),
  records: z.array(z.object({
    cadetId: z.string().uuid(),
    status: z.enum(['PRESENT', 'ABSENT', 'ON_DUTY', 'LEAVE', 'MEDICAL']),
    note: z.string().optional(),
  })).default([]),
});
