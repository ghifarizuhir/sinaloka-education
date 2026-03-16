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
  billing_mode: z.enum(['manual', 'per_session', 'package', 'subscription']).optional(),
  currency: z.enum(['IDR', 'USD']).optional(),
  invoice_prefix: z.string().min(1).max(20).optional(),
  late_payment_auto_lock: z.boolean().optional(),
  late_payment_threshold: z.number().min(0).optional(),
  expense_categories: z.array(z.string().min(1).max(50)).min(1).optional(),
  bank_accounts: z.array(z.object({
    id: z.string().optional(),
    bank_name: z.string().min(1).max(100),
    account_number: z.string().min(1).max(50),
    account_holder: z.string().min(1).max(255),
  })).optional(),
});

export type UpdateBillingSettingsDto = z.infer<typeof UpdateBillingSettingsSchema>;
