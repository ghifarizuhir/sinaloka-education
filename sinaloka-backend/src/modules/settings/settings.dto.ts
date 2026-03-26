import { z } from 'zod';

export const UpdateGeneralSettingsSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  timezone: z
    .enum([
      'Asia/Jakarta',
      'Asia/Singapore',
      'Asia/Makassar',
      'Asia/Jayapura',
      'UTC',
    ])
    .optional(),
  default_language: z.enum(['id', 'en']).optional(),
});

export type UpdateGeneralSettingsDto = z.infer<
  typeof UpdateGeneralSettingsSchema
>;

export const UpdateBillingSettingsSchema = z.object({
  currency: z.enum(['IDR', 'USD']).optional(),
  invoice_prefix: z.string().min(1).max(20).optional(),
  late_payment_auto_lock: z.boolean().optional(),
  late_payment_threshold: z.number().min(0).optional(),
  expense_categories: z.array(z.string().min(1).max(50)).min(1).optional(),
  bank_accounts: z
    .array(
      z.object({
        id: z.string().optional(),
        bank_name: z.string().min(1).max(100),
        account_number: z.string().min(1).max(50),
        account_holder: z.string().min(1).max(255),
      }),
    )
    .optional(),
});

export type UpdateBillingSettingsDto = z.infer<
  typeof UpdateBillingSettingsSchema
>;

const RoomSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.enum(['Classroom', 'Laboratory', 'Studio', 'Online']),
  capacity: z.number().int().min(1).nullable(),
  status: z.enum(['Available', 'Maintenance', 'Unavailable']),
});

const SubjectCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  order: z.number().int().min(0),
});

const GradeLevelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  order: z.number().int().min(0),
});

export const UpdateAcademicSettingsSchema = z.object({
  rooms: z.array(RoomSchema).optional(),
  subject_categories: z.array(SubjectCategorySchema).optional(),
  grade_levels: z.array(GradeLevelSchema).optional(),
  working_days: z
    .array(z.number().int().min(0).max(6))
    .min(1)
    .max(7)
    .optional(),
});

export type UpdateAcademicSettingsDto = z.infer<
  typeof UpdateAcademicSettingsSchema
>;

export const UpdatePaymentGatewaySchema = z.object({
  midtrans_server_key: z.string().min(1).optional(),
  midtrans_client_key: z.string().min(1).optional(),
  is_sandbox: z.boolean().optional(),
});

export type UpdatePaymentGatewayDto = z.infer<
  typeof UpdatePaymentGatewaySchema
>;

export const UpdateRegistrationSettingsSchema = z.object({
  student_enabled: z.boolean().optional(),
  tutor_enabled: z.boolean().optional(),
});

export type UpdateRegistrationSettingsDto = z.infer<
  typeof UpdateRegistrationSettingsSchema
>;

// ─── Landing Page ───────────────────────────────────────

const LandingFeatureSchema = z.object({
  id: z.string().uuid(),
  icon: z.string().min(1).max(30),
  title: z.string().min(1).max(50),
  description: z.string().min(1).max(120),
});

const GalleryImageSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  caption: z.string().max(100).optional(),
  order: z.number().int().min(0).max(5),
});

const SocialLinksSchema = z.object({
  instagram: z.string().max(200).optional(),
  tiktok: z.string().max(200).optional(),
  facebook: z.string().max(200).optional(),
  youtube: z.string().max(200).optional(),
  website: z.string().url().max(200).optional(),
});

export const UpdateLandingSettingsSchema = z.object({
  landing_enabled: z.boolean().optional(),
  landing_tagline: z.string().max(200).optional().nullable(),
  landing_about: z.string().max(2000).optional().nullable(),
  landing_cta_text: z.string().max(50).optional().nullable(),
  whatsapp_number: z.string().max(20).optional().nullable(),
  landing_features: z.array(LandingFeatureSchema).max(4).optional().nullable(),
  gallery_images: z.array(GalleryImageSchema).max(6).optional().nullable(),
  social_links: SocialLinksSchema.optional().nullable(),
});
export type UpdateLandingSettingsDto = z.infer<
  typeof UpdateLandingSettingsSchema
>;
