import api from '../lib/api';

export interface Settlement {
  id: string;
  institution_id: string;
  institution?: { id: string; name: string };
  student_id: string;
  student?: { id: string; name: string };
  payment_id: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  status: 'PENDING' | 'TRANSFERRED';
  transferred_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementSummary {
  total_pending: number;
  total_transferred: number;
  total_platform_fee: number;
  pending_count: number;
  transferred_count: number;
}

export interface SettlementReport {
  institution_id: string;
  institution?: { id: string; name: string };
  period: string;
  total_gross: number;
  total_fee: number;
  total_net: number;
  count: number;
}

export interface PaginatedSettlements {
  items: Settlement[];
  total: number;
  page: number;
  limit: number;
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
      .get<SettlementReport[]>('/api/admin/settlements/report', { params })
      .then((r) => r.data),

  markTransferred: (id: string, data: MarkTransferredData) =>
    api.patch(`/api/admin/settlements/${id}/transfer`, data).then((r) => r.data),

  batchTransfer: (data: BatchTransferData) =>
    api.patch('/api/admin/settlements/batch-transfer', data).then((r) => r.data),
};
