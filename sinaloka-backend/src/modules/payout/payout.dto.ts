import { z } from 'zod';

const PayoutStatus = z.enum(['PENDING', 'PROCESSING', 'PAID']);

export const CreatePayoutSchema = z.object({
  tutor_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
  status: PayoutStatus.default('PENDING'),
  description: z.string().max(500).optional().nullable(),
  period_start: z.coerce.date().optional().nullable(),
  period_end: z.coerce.date().optional().nullable(),
});
export type CreatePayoutDto = z.infer<typeof CreatePayoutSchema>;

export const UpdatePayoutSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  date: z.coerce.date().optional(),
  status: PayoutStatus.optional(),
  description: z.string().max(500).optional().nullable(),
  period_start: z.coerce.date().optional().nullable(),
  period_end: z.coerce.date().optional().nullable(),
});
export type UpdatePayoutDto = z.infer<typeof UpdatePayoutSchema>;

export const PayoutQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  tutor_id: z.string().uuid().optional(),
  status: PayoutStatus.optional(),
  sort_by: z.enum(['date', 'amount', 'created_at']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type PayoutQueryDto = z.infer<typeof PayoutQuerySchema>;

export const CalculatePayoutSchema = z.object({
  tutor_id: z.string().uuid(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
});
export type CalculatePayoutDto = z.infer<typeof CalculatePayoutSchema>;
