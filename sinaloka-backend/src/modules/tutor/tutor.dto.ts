import { z } from 'zod';

export const CreateTutorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  subjects: z.array(z.string().min(1)).min(1),
  experience_years: z.number().int().min(0).default(0),
  availability: z.record(z.string(), z.any()).optional().nullable(),
  bank_name: z.string().max(255).optional().nullable(),
  bank_account_number: z.string().max(50).optional().nullable(),
  bank_account_holder: z.string().max(255).optional().nullable(),
});
export type CreateTutorDto = z.infer<typeof CreateTutorSchema>;

export const UpdateTutorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subjects: z.array(z.string().min(1)).min(1).optional(),
  experience_years: z.number().int().min(0).optional(),
  availability: z.record(z.string(), z.any()).optional().nullable(),
  bank_name: z.string().max(255).optional().nullable(),
  bank_account_number: z.string().max(50).optional().nullable(),
  bank_account_holder: z.string().max(255).optional().nullable(),
  is_verified: z.boolean().optional(),
  rating: z.number().min(0).max(5).optional(),
  monthly_salary: z.number().min(0).optional().nullable(),
});
export type UpdateTutorDto = z.infer<typeof UpdateTutorSchema>;

export const TutorQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  subject: z.string().optional(),
  is_verified: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  sort_by: z
    .enum(['name', 'rating', 'experience_years', 'created_at'])
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type TutorQueryDto = z.infer<typeof TutorQuerySchema>;

export const UpdateTutorProfileSchema = z.object({
  availability: z.record(z.string(), z.any()).optional().nullable(),
  bank_name: z.string().max(255).optional().nullable(),
  bank_account_number: z.string().max(50).optional().nullable(),
  bank_account_holder: z.string().max(255).optional().nullable(),
});
export type UpdateTutorProfileDto = z.infer<typeof UpdateTutorProfileSchema>;
