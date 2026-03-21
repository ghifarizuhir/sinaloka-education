import { z } from 'zod';

const PaymentStatus = z.enum(['PAID', 'PENDING', 'OVERDUE']);
const PaymentMethod = z.enum(['CASH', 'TRANSFER', 'OTHER', 'MIDTRANS']);

export const CreatePaymentSchema = z.object({
  student_id: z.string().uuid(),
  enrollment_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  due_date: z.coerce.date(),
  paid_date: z.coerce.date().optional().nullable(),
  status: PaymentStatus.default('PENDING'),
  method: PaymentMethod.optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
export type CreatePaymentDto = z.infer<typeof CreatePaymentSchema>;

export const UpdatePaymentSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  due_date: z.coerce.date().optional(),
  paid_date: z.coerce.date().optional().nullable(),
  status: PaymentStatus.optional(),
  method: PaymentMethod.optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
export type UpdatePaymentDto = z.infer<typeof UpdatePaymentSchema>;

export const PaymentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: PaymentStatus.optional(),
  student_id: z.string().uuid().optional(),
  sort_by: z.enum(['due_date', 'amount', 'created_at']).default('due_date'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type PaymentQueryDto = z.infer<typeof PaymentQuerySchema>;

export const BatchRecordPaymentSchema = z.object({
  payment_ids: z.array(z.string().uuid()).min(1).max(50),
  paid_date: z.coerce.date(),
  method: PaymentMethod,
});
export type BatchRecordPaymentDto = z.infer<typeof BatchRecordPaymentSchema>;
