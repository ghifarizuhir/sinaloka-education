import { z } from 'zod';

export const StudentRegistrationSchema = z.object({
  name: z.string().min(1).max(255),
  grade: z.string().min(1).max(50),
  parent_name: z.string().min(1).max(255),
  parent_phone: z.string().min(1).max(20),
  email: z.string().email('Email is required'),
  phone: z.string().max(20).optional(),
  parent_email: z.string().email().optional(),
});

export type StudentRegistrationDto = z.infer<typeof StudentRegistrationSchema>;

export const TutorRegistrationSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  subject_names: z.array(z.string().min(1)).min(1),
  experience_years: z.coerce.number().min(0).optional(),
});

export type TutorRegistrationDto = z.infer<typeof TutorRegistrationSchema>;

export const RejectRegistrationSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type RejectRegistrationDto = z.infer<typeof RejectRegistrationSchema>;

export const RegistrationQuerySchema = z.object({
  type: z.enum(['STUDENT', 'TUTOR']).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type RegistrationQueryDto = z.infer<typeof RegistrationQuerySchema>;
