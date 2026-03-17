import { z } from 'zod';

export const AttendanceReportQuerySchema = z.object({
  date_from: z.coerce.date(),
  date_to: z.coerce.date(),
  class_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(),
});
export type AttendanceReportQueryDto = z.infer<typeof AttendanceReportQuerySchema>;

export const FinanceReportQuerySchema = z.object({
  date_from: z.coerce.date(),
  date_to: z.coerce.date(),
});
export type FinanceReportQueryDto = z.infer<typeof FinanceReportQuerySchema>;

export const StudentProgressQuerySchema = z.object({
  student_id: z.string().uuid(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
});
export type StudentProgressQueryDto = z.infer<typeof StudentProgressQuerySchema>;

export const ReportPeriodSchema = z.object({
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
});
export type ReportPeriodDto = z.infer<typeof ReportPeriodSchema>;

export const ExportCsvSchema = z.object({
  type: z.enum(['payments', 'payouts', 'expenses']),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
});
export type ExportCsvDto = z.infer<typeof ExportCsvSchema>;
