import api from '../lib/api';

export interface Settlement {
  id: string;
  institution_id: string;
  payment_id: string;
  gross_amount: string;
  midtrans_fee: string;
  transfer_amount: string;
  platform_cost: string;
  status: 'PENDING' | 'TRANSFERRED';
  transferred_at?: string | null;
  transferred_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  institution: { id: string; name: string };
  payment: {
    id: string;
    amount: string;
    student: { id: string; name: string } | null;
    midtrans_payment_type: string | null;
  };
}

export interface SettlementSummaryInstitution {
  institution_id: string;
  institution_name: string;
  pending_count: number;
  pending_amount: number;
  transferred_count: number;
  transferred_amount: number;
  total_platform_cost: number;
}

export interface SettlementSummary {
  institutions: SettlementSummaryInstitution[];
  totals: {
    total_pending: number;
    total_transferred: number;
    total_platform_cost: number;
  };
}

export interface SettlementReportTransaction {
  date: string;
  student_name: string;
  payment_type: string | null;
  gross_amount: number;
  midtrans_fee: number;
  transfer_amount: number;
  platform_cost: number;
  status: 'PENDING' | 'TRANSFERRED';
  transferred_at: string | null;
}

export interface SettlementReport {
  institution_name: string;
  period: string;
  transactions: SettlementReportTransaction[];
  summary: {
    total_gross: number;
    total_fee: number;
    total_net: number;
    total_platform_cost: number;
  };
}

export interface PaginatedSettlements {
  data: Settlement[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GetSettlementsParams {
  institution_id?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface GetSettlementReportParams {
  institution_id: string;
  period: string;
}

export interface MarkTransferredData {
  transferred_at: string;
  notes?: string;
}

export interface BatchTransferData {
  settlement_ids: string[];
  transferred_at: string;
  notes?: string;
}

export const settlementsService = {
  getSettlements: (params?: GetSettlementsParams) =>
    api
      .get<PaginatedSettlements>('/api/admin/settlements', { params })
      .then((r) => r.data),

  getSettlementSummary: () =>
    api.get<SettlementSummary>('/api/admin/settlements/summary').then((r) => r.data),

  getSettlementReport: (params: GetSettlementReportParams) =>
    api
      .get<SettlementReport>('/api/admin/settlements/report', { params })
      .then((r) => r.data),

  markTransferred: (id: string, data: MarkTransferredData) =>
    api.patch(`/api/admin/settlements/${id}/transfer`, data).then((r) => r.data),

  batchTransfer: (data: BatchTransferData) =>
    api.patch('/api/admin/settlements/batch-transfer', data).then((r) => r.data),
};
