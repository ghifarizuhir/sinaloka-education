import type { PaginationParams } from './common';

export interface Payment {
  id: string;
  student_id: string;
  enrollment_id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  method: 'CASH' | 'TRANSFER' | 'OTHER' | null;
  notes: string | null;
  student?: { id: string; name: string };
  enrollment?: { id: string; class?: { id: string; name: string } };
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentDto {
  student_id: string;
  enrollment_id: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status?: 'PAID' | 'PENDING' | 'OVERDUE';
  method?: 'CASH' | 'TRANSFER' | 'OTHER';
  notes?: string;
}

export interface UpdatePaymentDto {
  amount?: number;
  due_date?: string;
  paid_date?: string;
  status?: 'PAID' | 'PENDING' | 'OVERDUE';
  method?: 'CASH' | 'TRANSFER' | 'OTHER';
  notes?: string;
}

export interface PaymentQueryParams extends PaginationParams {
  status?: 'PAID' | 'PENDING' | 'OVERDUE';
  student_id?: string;
}
