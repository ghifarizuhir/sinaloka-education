import { z } from 'zod';

export const FonnteWebhookSchema = z.object({
  device: z.string(),
  id: z.string(),
  status: z.string(),
});
export type FonnteWebhookDto = z.infer<typeof FonnteWebhookSchema>;

export const WhatsappMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  related_type: z.string().optional(),
});
export type WhatsappMessagesQueryDto = z.infer<
  typeof WhatsappMessagesQuerySchema
>;

export const WhatsappStatsQuerySchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});
export type WhatsappStatsQueryDto = z.infer<typeof WhatsappStatsQuerySchema>;

export const UpdateWhatsappSettingsSchema = z.object({
  auto_reminders: z.boolean().optional(),
  remind_days_before: z.coerce.number().int().min(1).max(7).optional(),
});
export type UpdateWhatsappSettingsDto = z.infer<
  typeof UpdateWhatsappSettingsSchema
>;
