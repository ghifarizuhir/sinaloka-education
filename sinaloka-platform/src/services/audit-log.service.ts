import api from '@/src/lib/api';

export interface AuditLogEntry {
  id: string;
  institution_id: string | null;
  user_id: string;
  user_role: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  summary: string;
  changes: Record<string, { before: unknown; after: unknown }> | null;
  http_method: string;
  endpoint: string;
  status_code: number;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user: { id: string; name: string; email: string; role: string };
  institution: { id: string; name: string } | null;
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  action?: string;
  resource_type?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedAuditLogs {
  data: AuditLogEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const auditLogService = {
  getAll: (params?: AuditLogQueryParams) =>
    api.get<PaginatedAuditLogs>('/api/admin/audit-logs', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get<AuditLogEntry>(`/api/admin/audit-logs/${id}`).then((r) => r.data),
};
