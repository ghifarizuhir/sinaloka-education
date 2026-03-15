import { z } from 'zod';

const ExpenseCategory = z.enum(['RENT', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER']);

export const CreateExpenseSchema = z.object({
  category: ExpenseCategory,
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
  description: z.string().max(500).optional().nullable(),
  receipt_url: z.string().max(500).optional().nullable(),
});
export type CreateExpenseDto = z.infer<typeof CreateExpenseSchema>;

export const UpdateExpenseSchema = z.object({
  category: ExpenseCategory.optional(),
  amount: z.coerce.number().positive().optional(),
  date: z.coerce.date().optional(),
  description: z.string().max(500).optional().nullable(),
  receipt_url: z.string().max(500).optional().nullable(),
});
export type UpdateExpenseDto = z.infer<typeof UpdateExpenseSchema>;

export const ExpenseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: ExpenseCategory.optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  sort_by: z.enum(['date', 'amount', 'created_at']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type ExpenseQueryDto = z.infer<typeof ExpenseQuerySchema>;
