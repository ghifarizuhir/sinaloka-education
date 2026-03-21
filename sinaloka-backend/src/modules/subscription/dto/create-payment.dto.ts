import { z } from 'zod';

export const CreateSubscriptionPaymentSchema = z.object({
  plan_type: z.enum(['GROWTH', 'BUSINESS']),
  method: z.enum(['MIDTRANS', 'MANUAL_TRANSFER']),
  type: z.enum(['new', 'renewal']).default('new'),
  proof_url: z.string().url().optional(),
});

export type CreateSubscriptionPaymentDto = z.infer<
  typeof CreateSubscriptionPaymentSchema
>;
