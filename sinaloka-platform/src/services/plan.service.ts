import api from '../lib/api';
import type { PlanInfo, UpgradeRequest } from '../types/plan';

export const planService = {
  getPlan: () =>
    api.get<PlanInfo>('/api/admin/plan').then((r) => r.data),

  requestUpgrade: (data: { requested_plan: string; message?: string }) =>
    api.post<UpgradeRequest>('/api/admin/plan/upgrade-request', data).then((r) => r.data),

  // SUPER_ADMIN
  getUpgradeRequests: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ data: UpgradeRequest[]; total: number }>('/api/admin/plan/upgrade-requests', { params }).then((r) => r.data),

  reviewUpgradeRequest: (id: string, data: { status: 'APPROVED' | 'REJECTED'; review_notes?: string }) =>
    api.patch<UpgradeRequest>(`/api/admin/plan/upgrade-requests/${id}`, data).then((r) => r.data),

  updateInstitutionPlan: (institutionId: string, data: { plan_type: string }) =>
    api.patch(`/api/admin/plan/institutions/${institutionId}`, data).then((r) => r.data),
};
