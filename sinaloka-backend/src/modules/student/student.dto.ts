import { z } from 'zod';

const StudentStatus = z.enum(['ACTIVE', 'INACTIVE']);

export const CreateStudentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  grade: z.string().min(1, 'Grade is required').max(50),
  status: StudentStatus.default('ACTIVE'),
  parent_name: z.string().max(255).optional().nullable(),
  parent_phone: z.string().max(20).optional().nullable(),
  parent_email: z.string().email().optional().nullable(),
  enrolled_at: z.coerce.date().optional(),
});
export type CreateStudentDto = z.infer<typeof CreateStudentSchema>;

export const UpdateStudentSchema = CreateStudentSchema.partial();
export type UpdateStudentDto = z.infer<typeof UpdateStudentSchema>;

export const StudentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  grade: z.string().optional(),
  status: StudentStatus.optional(),
  sort_by: z.enum(['name', 'grade', 'enrolled_at', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type StudentQueryDto = z.infer<typeof StudentQuerySchema>;
