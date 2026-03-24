import { z } from 'zod';

export const SetBillingModeSchema = z.object({
  billing_mode: z.enum(['PER_SESSION', 'MONTHLY_FIXED']),
});
export type SetBillingModeDto = z.infer<typeof SetBillingModeSchema>;
