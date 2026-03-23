import { z } from 'zod';

const AttendanceStatus = z.enum(['PRESENT', 'ABSENT', 'LATE']);

export const CreateAttendanceRecordSchema = z.object({
  student_id: z.string().uuid(),
  status: AttendanceStatus,
  homework_done: z.boolean().default(false),
  notes: z.string().max(500).optional().nullable(),
});

export const BatchCreateAttendanceSchema = z.object({
  session_id: z.string().uuid(),
  records: z.array(CreateAttendanceRecordSchema).min(1),
});
export type BatchCreateAttendanceDto = z.infer<
  typeof BatchCreateAttendanceSchema
>;

export const UpdateAttendanceSchema = z.object({
  status: AttendanceStatus.optional(),
  homework_done: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
});
export type UpdateAttendanceDto = z.infer<typeof UpdateAttendanceSchema>;

export const AttendanceQuerySchema = z.object({
  session_id: z.string().uuid(),
});
export type AttendanceQueryDto = z.infer<typeof AttendanceQuerySchema>;

export const AttendanceSummaryQuerySchema = z.object({
  class_id: z.string().uuid(),
  date_from: z.coerce.date(),
  date_to: z.coerce.date(),
});
export type AttendanceSummaryQueryDto = z.infer<
  typeof AttendanceSummaryQuerySchema
>;

export const StudentAttendanceQuerySchema = z.object({
  date_from: z.coerce.date(),
  date_to: z.coerce.date(),
});
export type StudentAttendanceQueryDto = z.infer<typeof StudentAttendanceQuerySchema>;
