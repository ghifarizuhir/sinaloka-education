import { z } from 'zod';

export const CreateInstitutionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email('Invalid email address').optional(),
  logo_url: z.string().url('Invalid URL').optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  timezone: z.string().optional(),
  default_language: z.string().optional(),
  admin: z
    .object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8),
    })
    .optional(),
});

export type CreateInstitutionDto = z.infer<typeof CreateInstitutionSchema>;

export const UpdateInstitutionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable(),
  logo_url: z.string().url('Invalid URL').optional().nullable(),
  settings: z.record(z.string(), z.unknown()).optional().nullable(),
  timezone: z.string().optional().nullable(),
  default_language: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  description: z.string().max(500).nullable().optional(),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').nullable().optional(),
  background_image_url: z.string().url().nullable().optional(),
});

export type UpdateInstitutionDto = z.infer<typeof UpdateInstitutionSchema>;
