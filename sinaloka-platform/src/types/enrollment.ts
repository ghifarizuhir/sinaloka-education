import type { PaginationParams } from './common';

export interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  status: 'ACTIVE' | 'TRIAL' | 'WAITLISTED' | 'DROPPED';
  payment_status: 'PAID' | 'PENDING' | 'OVERDUE';
  enrolled_at: string;
  student?: { id: string; name: string };
  class?: { id: string; name: string };
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEnrollmentDto {
  student_id: string;
  class_id: string;
  status?: 'ACTIVE' | 'TRIAL' | 'WAITLISTED' | 'DROPPED';
  payment_status?: 'PAID' | 'PENDING' | 'OVERDUE';
  enrolled_at?: string;
}

export interface UpdateEnrollmentDto {
  status?: 'ACTIVE' | 'TRIAL' | 'WAITLISTED' | 'DROPPED';
  payment_status?: 'PAID' | 'PENDING' | 'OVERDUE';
}

export interface EnrollmentQueryParams extends PaginationParams {
  student_id?: string;
  class_id?: string;
  status?: 'ACTIVE' | 'TRIAL' | 'WAITLISTED' | 'DROPPED';
  payment_status?: 'PAID' | 'PENDING' | 'OVERDUE';
}

export interface CheckConflictDto {
  student_id: string;
  class_id: string;
}
