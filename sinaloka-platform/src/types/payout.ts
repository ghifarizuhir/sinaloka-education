import type { PaginationParams } from './common';

export interface Payout {
  id: string;
  tutor_id: string;
  amount: number;
  date: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID';
  description: string | null;
  tutor?: { id: string; name: string; bank_name: string | null; bank_account_number: string | null };
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePayoutDto {
  tutor_id: string;
  amount: number;
  date: string;
  status?: 'PENDING' | 'PROCESSING' | 'PAID';
  description?: string;
}

export interface UpdatePayoutDto {
  amount?: number;
  date?: string;
  status?: 'PENDING' | 'PROCESSING' | 'PAID';
  description?: string;
}

export interface PayoutQueryParams extends PaginationParams {
  tutor_id?: string;
  status?: 'PENDING' | 'PROCESSING' | 'PAID';
}
