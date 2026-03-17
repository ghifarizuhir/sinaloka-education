import type { PaginationParams } from './common';

export interface Tutor {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  experience_years: number;
  rating: number;
  is_verified: boolean;
  availability: Record<string, unknown> | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  monthly_salary: number | null;
  user_id: string;
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTutorDto {
  name: string;
  email: string;
  password: string;
  subjects: string[];
  experience_years?: number;
  availability?: Record<string, unknown>;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
}

export interface UpdateTutorDto {
  name?: string;
  subjects?: string[];
  experience_years?: number;
  availability?: Record<string, unknown>;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  is_verified?: boolean;
  rating?: number;
  monthly_salary?: number | null;
}

export interface TutorQueryParams extends PaginationParams {
  subject?: string;
  is_verified?: boolean;
}
