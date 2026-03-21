import { z } from 'zod';

export const OverrideSubscriptionSchema = z.object({
  plan_type: z.enum(['STARTER', 'GROWTH', 'BUSINESS']).optional(),
  expires_at: z.coerce.date().optional(),
  status: z.enum(['ACTIVE', 'GRACE_PERIOD', 'EXPIRED', 'CANCELLED']).optional(),
  notes: z.string().min(1).max(500),
});

export type OverrideSubscriptionDto = z.infer<typeof OverrideSubscriptionSchema>;
