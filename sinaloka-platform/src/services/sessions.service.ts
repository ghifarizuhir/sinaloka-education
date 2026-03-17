import api from '@/src/lib/api';
import type { PaginatedResponse } from '@/src/types/common';
import type { Session, SessionDetail, SessionStudent, CreateSessionDto, UpdateSessionDto, SessionQueryParams, GenerateSessionsDto, ApproveRescheduleDto } from '@/src/types/session';

export const sessionsService = {
  getAll: (params?: SessionQueryParams) =>
    api.get<PaginatedResponse<Session>>('/api/admin/sessions', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<SessionDetail>(`/api/admin/sessions/${id}`).then((r) => r.data),
  create: (data: CreateSessionDto) =>
    api.post<Session>('/api/admin/sessions', data).then((r) => r.data),
  update: ({ id, data }: { id: string; data: UpdateSessionDto }) =>
    api.patch<Session>(`/api/admin/sessions/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/api/admin/sessions/${id}`),
  generate: (data: GenerateSessionsDto) =>
    api.post<Session[]>('/api/admin/sessions/generate', data).then((r) => r.data),
  approveReschedule: ({ id, data }: { id: string; data: ApproveRescheduleDto }) =>
    api.patch<Session>(`/api/admin/sessions/${id}/approve`, data).then((r) => r.data),
  getStudents: (sessionId: string) =>
    api.get<{ students: SessionStudent[] }>(`/api/admin/sessions/${sessionId}/students`).then((r) => r.data),
};
