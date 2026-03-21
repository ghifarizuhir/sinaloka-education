import { z } from 'zod';

export const ConfirmSubscriptionPaymentSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(500).optional(),
});

export type ConfirmSubscriptionPaymentDto = z.infer<typeof ConfirmSubscriptionPaymentSchema>;
