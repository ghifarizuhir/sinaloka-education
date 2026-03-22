import { z } from 'zod';

export const AuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE']).optional(),
  resource_type: z.string().optional(),
  user_id: z.string().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type AuditLogQueryDto = z.infer<typeof AuditLogQuerySchema>;
