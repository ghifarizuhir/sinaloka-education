import api from '@/lib/api';
import type { Attendance, UpdateAttendanceDto, AttendanceQueryParams, AttendanceSummaryParams } from '@/types/attendance';

export const attendanceService = {
  getBySession: (params: AttendanceQueryParams) =>
    api.get<Attendance[]>('/api/admin/attendance', { params }).then((r) => r.data),
  getSummary: (params: AttendanceSummaryParams) =>
    api.get('/api/admin/attendance/summary', { params }).then((r) => r.data),
  update: ({ id, data }: { id: string; data: UpdateAttendanceDto }) =>
    api.patch<Attendance>(`/api/admin/attendance/${id}`, data).then((r) => r.data),
};
