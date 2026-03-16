import type { PaginationParams } from './common';

export interface Payout {
  id: string;
  tutor_id: string;
  amount: number;
  date: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID';
  description: string | null;
  tutor?: {
    id: string;
    name?: string;
    bank_name?: string | null;
    bank_account_number?: string | null;
    user?: { name: string };
  };
  period_start: string | null;
  period_end: string | null;
  institution_id: string;
  created_at: string;
  updated_at: string;
}

/** Extract tutor name from either flattened or nested shape */
export function getPayoutTutorName(payout: Payout): string {
  return payout.tutor?.name || payout.tutor?.user?.name || '';
}

/** Extract bank info from payout tutor */
export function getPayoutBankInfo(payout: Payout): { bank_name: string | null; bank_account_number: string | null } {
  return {
    bank_name: payout.tutor?.bank_name ?? null,
    bank_account_number: payout.tutor?.bank_account_number ?? null,
  };
}

export interface CreatePayoutDto {
  tutor_id: string;
  amount: number;
  date: string;
  status?: 'PENDING' | 'PROCESSING' | 'PAID';
  description?: string;
  period_start?: string;
  period_end?: string;
}

export interface UpdatePayoutDto {
  amount?: number;
  date?: string;
  status?: 'PENDING' | 'PROCESSING' | 'PAID';
  description?: string;
  period_start?: string;
  period_end?: string;
}

export interface PayoutQueryParams extends PaginationParams {
  tutor_id?: string;
  status?: 'PENDING' | 'PROCESSING' | 'PAID';
}

export interface PayoutCalculation {
  tutor_id: string;
  tutor_name: string;
  period_start: string;
  period_end: string;
  sessions: {
    session_id: string;
    class_name: string;
    date: string;
    tutor_fee_amount: number;
  }[];
  total_sessions: number;
  calculated_amount: number;
  overlap_warning: string | null;
}
