import { z } from 'zod';

export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'TUTOR']),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  email: z.string().email('Invalid email address').optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .optional(),
  role: z.enum(['ADMIN', 'TUTOR']).optional(),
  institution_id: z
    .string()
    .uuid('Invalid institution ID')
    .optional()
    .nullable(),
  is_active: z.boolean().optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export const UserQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'TUTOR', 'PARENT']).optional(),
  is_active: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  institution_id: z.string().uuid().optional(),
});

export type UserQueryDto = z.infer<typeof UserQuerySchema>;
