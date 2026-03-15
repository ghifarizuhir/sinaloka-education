import api from '@/lib/api';
import type { AttendanceReportParams, FinanceReportParams, StudentProgressReportParams } from '@/types/report';

export const reportsService = {
  getAttendanceReport: (params: AttendanceReportParams) =>
    api.get('/api/admin/reports/attendance', { params, responseType: 'blob' }).then((r) => r.data as Blob),
  getFinanceReport: (params: FinanceReportParams) =>
    api.get('/api/admin/reports/finance', { params, responseType: 'blob' }).then((r) => r.data as Blob),
  getStudentProgressReport: (params: StudentProgressReportParams) =>
    api.get('/api/admin/reports/student-progress', { params, responseType: 'blob' }).then((r) => r.data as Blob),
};
