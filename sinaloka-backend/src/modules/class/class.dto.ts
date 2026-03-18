import { z } from 'zod';

const ClassStatus = z.enum(['ACTIVE', 'ARCHIVED']);
const ScheduleDay = z.enum([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]);
const TimeString = z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format');
const TutorFeeMode = z.enum(['FIXED_PER_SESSION', 'PER_STUDENT_ATTENDANCE', 'MONTHLY_SALARY']);

export const CreateClassSchema = z
  .object({
    tutor_id: z.string().uuid(),
    name: z.string().min(1, 'Name is required').max(255),
    subject_id: z.string().uuid('Valid subject is required'),
    capacity: z.number().int().min(1),
    fee: z.number().min(0),
    schedule_days: z.array(ScheduleDay).min(1),
    schedule_start_time: TimeString,
    schedule_end_time: TimeString,
    room: z.string().max(100).optional().nullable(),
    package_fee: z.number().min(0).optional().nullable(),
    tutor_fee: z.number().min(0),
    tutor_fee_mode: TutorFeeMode.default('FIXED_PER_SESSION'),
    tutor_fee_per_student: z.number().min(0).optional().nullable(),
    status: ClassStatus.default('ACTIVE'),
  })
  .refine((data) => data.schedule_start_time < data.schedule_end_time, {
    message: 'schedule_start_time must be before schedule_end_time',
    path: ['schedule_end_time'],
  })
  .refine(
    (data) => data.tutor_fee_mode !== 'PER_STUDENT_ATTENDANCE' || (data.tutor_fee_per_student != null && data.tutor_fee_per_student > 0),
    {
      message: 'tutor_fee_per_student is required when mode is PER_STUDENT_ATTENDANCE',
      path: ['tutor_fee_per_student'],
    },
  );
export type CreateClassDto = z.infer<typeof CreateClassSchema>;

export const UpdateClassSchema = z
  .object({
    tutor_id: z.string().uuid().optional(),
    name: z.string().min(1).max(255).optional(),
    subject_id: z.string().uuid().optional(),
    capacity: z.number().int().min(1).optional(),
    fee: z.number().min(0).optional(),
    schedule_days: z.array(ScheduleDay).min(1).optional(),
    schedule_start_time: TimeString.optional(),
    schedule_end_time: TimeString.optional(),
    room: z.string().max(100).optional().nullable(),
    package_fee: z.number().min(0).optional().nullable(),
    tutor_fee: z.number().min(0).optional(),
    tutor_fee_mode: TutorFeeMode.optional(),
    tutor_fee_per_student: z.number().min(0).optional().nullable(),
    status: ClassStatus.optional(),
  })
  .refine(
    (data) => {
      if (data.schedule_start_time && data.schedule_end_time) {
        return data.schedule_start_time < data.schedule_end_time;
      }
      return true;
    },
    {
      message: 'schedule_start_time must be before schedule_end_time',
      path: ['schedule_end_time'],
    },
  );
export type UpdateClassDto = z.infer<typeof UpdateClassSchema>;

export const ClassQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  subject_id: z.string().uuid().optional(),
  status: ClassStatus.optional(),
  sort_by: z
    .enum(['name', 'subject_name', 'capacity', 'created_at'])
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type ClassQueryDto = z.infer<typeof ClassQuerySchema>;
