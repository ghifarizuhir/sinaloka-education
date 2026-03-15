import type { PaginationParams } from './common';

export interface Student {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  grade: string;
  status: 'ACTIVE' | 'INACTIVE';
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  enrolled_at: string | null;
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStudentDto {
  name: string;
  email?: string;
  phone?: string;
  grade: string;
  status?: 'ACTIVE' | 'INACTIVE';
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  enrolled_at?: string;
}

export type UpdateStudentDto = Partial<CreateStudentDto>;

export interface StudentQueryParams extends PaginationParams {
  grade?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}
