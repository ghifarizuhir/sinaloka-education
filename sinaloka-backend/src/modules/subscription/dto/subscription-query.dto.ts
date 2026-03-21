import { z } from 'zod';

export const SubscriptionQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'GRACE_PERIOD', 'EXPIRED', 'CANCELLED']).optional(),
  plan_type: z.enum(['GROWTH', 'BUSINESS']).optional(),
  institution_id: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SubscriptionQueryDto = z.infer<typeof SubscriptionQuerySchema>;

export const PaymentQuerySchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'EXPIRED']).optional(),
  method: z.enum(['MIDTRANS', 'MANUAL_TRANSFER']).optional(),
  institution_id: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaymentQueryDto = z.infer<typeof PaymentQuerySchema>;
