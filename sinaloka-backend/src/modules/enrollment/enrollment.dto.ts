import { z } from 'zod';

const EnrollmentStatus = z.enum(['ACTIVE', 'TRIAL', 'WAITLISTED', 'DROPPED']);
const PaymentStatus = z.enum(['PAID', 'PENDING', 'OVERDUE']);

export const CreateEnrollmentSchema = z.object({
  student_id: z.string().uuid(),
  class_id: z.string().uuid(),
  status: EnrollmentStatus.default('ACTIVE'),
  payment_status: PaymentStatus.default('PENDING'),
  enrolled_at: z.coerce.date().optional(),
});
export type CreateEnrollmentDto = z.infer<typeof CreateEnrollmentSchema>;

export const UpdateEnrollmentSchema = z.object({
  status: EnrollmentStatus.optional(),
  payment_status: PaymentStatus.optional(),
});
export type UpdateEnrollmentDto = z.infer<typeof UpdateEnrollmentSchema>;

export const EnrollmentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  student_id: z.string().uuid().optional(),
  class_id: z.string().uuid().optional(),
  status: EnrollmentStatus.optional(),
  payment_status: PaymentStatus.optional(),
  sort_by: z.enum(['enrolled_at', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type EnrollmentQueryDto = z.infer<typeof EnrollmentQuerySchema>;

export const CheckConflictSchema = z.object({
  student_id: z.string().uuid(),
  class_id: z.string().uuid(),
});
export type CheckConflictDto = z.infer<typeof CheckConflictSchema>;

export const ImportEnrollmentRowSchema = z.object({
  student_id: z.string().uuid(),
  class_id: z.string().uuid(),
  status: EnrollmentStatus.default('ACTIVE'),
});
export type ImportEnrollmentRowDto = z.infer<typeof ImportEnrollmentRowSchema>;
