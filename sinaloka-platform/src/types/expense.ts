import type { PaginationParams } from './common';

export type ExpenseCategory = 'RENT' | 'UTILITIES' | 'SUPPLIES' | 'MARKETING' | 'OTHER';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string | null;
  receipt_url: string | null;
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseDto {
  category: ExpenseCategory;
  amount: number;
  date: string;
  description?: string;
  receipt_url?: string;
}

export interface UpdateExpenseDto {
  category?: ExpenseCategory;
  amount?: number;
  date?: string;
  description?: string;
  receipt_url?: string;
}

export interface ExpenseQueryParams extends PaginationParams {
  category?: ExpenseCategory;
  date_from?: string;
  date_to?: string;
}
