import { z } from 'zod';

// --- Academic Year ---

export const CreateAcademicYearSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(50),
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
  })
  .refine((d) => d.start_date < d.end_date, {
    message: 'start_date must be before end_date',
    path: ['end_date'],
  });
export type CreateAcademicYearDto = z.infer<typeof CreateAcademicYearSchema>;

export const UpdateAcademicYearSchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
  })
  .refine(
    (d) => {
      if (d.start_date && d.end_date) return d.start_date < d.end_date;
      return true;
    },
    { message: 'start_date must be before end_date', path: ['end_date'] },
  );
export type UpdateAcademicYearDto = z.infer<typeof UpdateAcademicYearSchema>;

export const AcademicYearQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});
export type AcademicYearQueryDto = z.infer<typeof AcademicYearQuerySchema>;

// --- Semester ---

export const CreateSemesterSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(50),
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
  })
  .refine((d) => d.start_date < d.end_date, {
    message: 'start_date must be before end_date',
    path: ['end_date'],
  });
export type CreateSemesterDto = z.infer<typeof CreateSemesterSchema>;

export const UpdateSemesterSchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
  })
  .refine(
    (d) => {
      if (d.start_date && d.end_date) return d.start_date < d.end_date;
      return true;
    },
    { message: 'start_date must be before end_date', path: ['end_date'] },
  );
export type UpdateSemesterDto = z.infer<typeof UpdateSemesterSchema>;

// --- Roll-over ---

export const RollOverSchema = z.object({
  source_semester_id: z.string().uuid(),
  class_ids: z.array(z.string().uuid()).optional(),
});
export type RollOverDto = z.infer<typeof RollOverSchema>;
