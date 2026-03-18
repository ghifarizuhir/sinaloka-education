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
const TutorFeeMode = z.enum([
  'FIXED_PER_SESSION',
  'PER_STUDENT_ATTENDANCE',
  'MONTHLY_SALARY',
]);

const ScheduleItemSchema = z
  .object({
    day: ScheduleDay,
    start_time: TimeString,
    end_time: TimeString,
  })
  .refine((d) => d.start_time < d.end_time, {
    message: 'start_time must be before end_time',
    path: ['end_time'],
  });

export const CreateClassSchema = z
  .object({
    tutor_id: z.string().uuid(),
    name: z.string().min(1, 'Name is required').max(255),
    subject_id: z.string().uuid('Valid subject is required'),
    capacity: z.number().int().min(1),
    fee: z.number().min(0),
    schedules: z
      .array(ScheduleItemSchema)
      .min(1, 'At least one schedule is required')
      .refine(
        (items) => new Set(items.map((i) => i.day)).size === items.length,
        { message: 'Duplicate schedule days are not allowed' },
      ),
    room: z.string().max(100).optional().nullable(),
    package_fee: z.number().min(0).optional().nullable(),
    tutor_fee: z.number().min(0),
    tutor_fee_mode: TutorFeeMode.default('FIXED_PER_SESSION'),
    tutor_fee_per_student: z.number().min(0).optional().nullable(),
    status: ClassStatus.default('ACTIVE'),
  })
  .refine(
    (data) =>
      data.tutor_fee_mode !== 'PER_STUDENT_ATTENDANCE' ||
      (data.tutor_fee_per_student != null && data.tutor_fee_per_student > 0),
    {
      message:
        'tutor_fee_per_student is required when mode is PER_STUDENT_ATTENDANCE',
      path: ['tutor_fee_per_student'],
    },
  );
export type CreateClassDto = z.infer<typeof CreateClassSchema>;

export const UpdateClassSchema = z.object({
  tutor_id: z.string().uuid().optional(),
  name: z.string().min(1).max(255).optional(),
  subject_id: z.string().uuid().optional(),
  capacity: z.number().int().min(1).optional(),
  fee: z.number().min(0).optional(),
  schedules: z
    .array(ScheduleItemSchema)
    .min(1)
    .refine(
      (items) => new Set(items.map((i) => i.day)).size === items.length,
      { message: 'Duplicate schedule days are not allowed' },
    )
    .optional(),
  room: z.string().max(100).optional().nullable(),
  package_fee: z.number().min(0).optional().nullable(),
  tutor_fee: z.number().min(0).optional(),
  tutor_fee_mode: TutorFeeMode.optional(),
  tutor_fee_per_student: z.number().min(0).optional().nullable(),
  status: ClassStatus.optional(),
});
export type UpdateClassDto = z.infer<typeof UpdateClassSchema>;

export const ClassQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  subject_id: z.string().uuid().optional(),
  tutor_id: z.string().uuid().optional(),
  status: ClassStatus.optional(),
  sort_by: z
    .enum(['name', 'subject_name', 'capacity', 'created_at'])
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type ClassQueryDto = z.infer<typeof ClassQuerySchema>;
