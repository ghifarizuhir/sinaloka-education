import { z } from 'zod';

export const SettlementQuerySchema = z.object({
  institution_id: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'TRANSFERRED']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type SettlementQueryDto = z.infer<typeof SettlementQuerySchema>;

export const TransferSettlementSchema = z.object({
  transferred_at: z.coerce.date(),
  notes: z.string().optional(),
});
export type TransferSettlementDto = z.infer<typeof TransferSettlementSchema>;

export const BatchTransferSchema = z.object({
  settlement_ids: z.array(z.string().uuid()).min(1),
  transferred_at: z.coerce.date(),
  notes: z.string().optional(),
});
export type BatchTransferDto = z.infer<typeof BatchTransferSchema>;

export const ReportQuerySchema = z.object({
  institution_id: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM'),
});
export type ReportQueryDto = z.infer<typeof ReportQuerySchema>;
