import { z } from 'zod';
import { startOfDay } from 'date-fns';

const SessionStatus = z.enum([
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
  'RESCHEDULE_REQUESTED',
]);

const TimeString = z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format');

export const CreateSessionSchema = z
  .object({
    class_id: z.string().uuid(),
    date: z.coerce.date(),
    start_time: TimeString,
    end_time: TimeString,
    status: SessionStatus.default('SCHEDULED'),
    topic_covered: z.string().max(500).optional().nullable(),
    session_summary: z.string().max(2000).optional().nullable(),
  })
  .refine((d) => d.date >= startOfDay(new Date()), {
    message: 'Cannot create a session for a past date',
    path: ['date'],
  })
  .refine((d) => d.start_time < d.end_time, {
    message: 'start_time must be before end_time',
    path: ['end_time'],
  });
export type CreateSessionDto = z.infer<typeof CreateSessionSchema>;

export const UpdateSessionSchema = z
  .object({
    date: z.coerce.date().optional(),
    start_time: TimeString.optional(),
    end_time: TimeString.optional(),
    status: SessionStatus.optional(),
    topic_covered: z.string().max(500).optional().nullable(),
    session_summary: z.string().max(2000).optional().nullable(),
  })
  .refine(
    (d) => {
      if (d.start_time && d.end_time) return d.start_time < d.end_time;
      return true;
    },
    {
      message: 'start_time must be before end_time',
      path: ['end_time'],
    },
  );
export type UpdateSessionDto = z.infer<typeof UpdateSessionSchema>;

export const GenerateSessionsSchema = z.object({
  class_id: z.string().uuid(),
  date_from: z.coerce.date(),
  date_to: z.coerce.date(),
});
export type GenerateSessionsDto = z.infer<typeof GenerateSessionsSchema>;

export const ApproveRescheduleSchema = z.object({
  approved: z.boolean(),
});
export type ApproveRescheduleDto = z.infer<typeof ApproveRescheduleSchema>;

export const RequestRescheduleSchema = z
  .object({
    proposed_date: z.coerce.date(),
    proposed_start_time: TimeString,
    proposed_end_time: TimeString,
    reschedule_reason: z.string().min(1).max(500),
  })
  .refine((d) => d.proposed_start_time < d.proposed_end_time, {
    message: 'proposed_start_time must be before proposed_end_time',
    path: ['proposed_end_time'],
  });
export type RequestRescheduleDto = z.infer<typeof RequestRescheduleSchema>;

export const SessionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  class_id: z.string().uuid().optional(),
  status: SessionStatus.optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  sort_by: z.enum(['date', 'start_time', 'created_at']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
});
export type SessionQueryDto = z.infer<typeof SessionQuerySchema>;

export const TutorScheduleQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: SessionStatus.optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  sort_by: z.enum(['date', 'start_time', 'created_at']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
});
export type TutorScheduleQueryDto = z.infer<typeof TutorScheduleQuerySchema>;

export const CompleteSessionSchema = z.object({
  topic_covered: z.string().min(1).max(500),
  session_summary: z.string().max(2000).optional().nullable(),
});
export type CompleteSessionDto = z.infer<typeof CompleteSessionSchema>;
