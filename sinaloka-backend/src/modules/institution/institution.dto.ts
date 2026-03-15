import { z } from 'zod';

export const CreateInstitutionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email('Invalid email address').optional(),
  logo_url: z.string().url('Invalid URL').optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export type CreateInstitutionDto = z.infer<typeof CreateInstitutionSchema>;

export const UpdateInstitutionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable(),
  logo_url: z.string().url('Invalid URL').optional().nullable(),
  settings: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type UpdateInstitutionDto = z.infer<typeof UpdateInstitutionSchema>;
