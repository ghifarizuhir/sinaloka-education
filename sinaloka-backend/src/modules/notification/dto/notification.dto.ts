import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const listNotificationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.string().optional(),
  unread: z.coerce.boolean().optional(),
});

export class ListNotificationsDto extends createZodDto(
  listNotificationsSchema,
) {}
