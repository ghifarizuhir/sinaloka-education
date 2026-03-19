import { z } from 'zod';

// --- Admin DTOs ---

export const CreateParentInviteSchema = z.object({
  email: z.string().email(),
  student_ids: z
    .array(z.string().uuid())
    .min(1, 'At least one student is required'),
});
export type CreateParentInviteDto = z.infer<typeof CreateParentInviteSchema>;

export const LinkStudentsSchema = z.object({
  student_ids: z
    .array(z.string().uuid())
    .min(1, 'At least one student is required'),
});
export type LinkStudentsDto = z.infer<typeof LinkStudentsSchema>;

export const ParentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort_by: z.enum(['name', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type ParentQueryDto = z.infer<typeof ParentQuerySchema>;

// --- Auth DTOs ---

export const ParentRegisterSchema = z.object({
  token: z.string().min(1, 'Invite token is required'),
  name: z.string().min(1, 'Name is required').max(255),
  password: z.string().min(8).max(128),
});
export type ParentRegisterDto = z.infer<typeof ParentRegisterSchema>;

// --- Parent-facing DTOs ---

export const ChildAttendanceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  class_id: z.string().uuid().optional(),
});
export type ChildAttendanceQueryDto = z.infer<
  typeof ChildAttendanceQuerySchema
>;

export const ChildSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
});
export type ChildSessionsQueryDto = z.infer<typeof ChildSessionsQuerySchema>;

export const ChildPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PAID', 'PENDING', 'OVERDUE']).optional(),
});
export type ChildPaymentsQueryDto = z.infer<typeof ChildPaymentsQuerySchema>;
