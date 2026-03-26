import { z } from 'zod';

export const SLUG_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export const RESERVED_SLUGS = [
  // Active subdomains
  'platform',
  'parent',
  'tutors',
  'api',
  'www',
  'admin',
  'app',
  'dashboard',
  // Infrastructure
  'cdn',
  'static',
  'assets',
  'status',
  'docs',
  // Email / DNS
  'mail',
  'smtp',
  'imap',
  'pop',
  'ftp',
  'ns1',
  'ns2',
  // Environments
  'staging',
  'dev',
  'test',
  // Common reserved
  'auth',
  'login',
  'register',
  'support',
  'help',
  'localhost',
] as const;

export const CreateInstitutionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable(),
  logo_url: z.string().url('Invalid URL').optional().nullable(),
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
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(63, 'Slug must be at most 63 characters')
    .regex(
      SLUG_REGEX,
      'Slug must be lowercase alphanumeric with hyphens, cannot start or end with hyphen',
    )
    .refine((val) => !RESERVED_SLUGS.includes(val as any), {
      message: 'This slug is reserved and cannot be used',
    })
    .optional(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable(),
  logo_url: z.string().url('Invalid URL').optional().nullable(),
  settings: z.record(z.string(), z.unknown()).optional().nullable(),
  timezone: z.string().optional().nullable(),
  default_language: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
  description: z.string().max(500).nullable().optional(),
  brand_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color')
    .nullable()
    .optional(),
  background_image_url: z.string().url().nullable().optional(),
});

export type UpdateInstitutionDto = z.infer<typeof UpdateInstitutionSchema>;
