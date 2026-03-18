import api from '@/src/lib/api';
import type {
  AttendanceReportParams, FinanceReportParams, StudentProgressReportParams,
  ReportPeriodParams, FinancialSummary, RevenueBreakdown, ExpenseBreakdown, ExportCsvParams,
} from '@/src/types/report';

export const reportsService = {
  getAttendanceReport: (params: AttendanceReportParams) =>
    api.get('/api/admin/reports/attendance', { params, responseType: 'blob' }).then((r) => r.data as Blob),
  getFinanceReport: (params: FinanceReportParams) =>
    api.get('/api/admin/reports/finance', { params, responseType: 'blob' }).then((r) => r.data as Blob),
  getStudentProgressReport: (params: StudentProgressReportParams) =>
    api.get('/api/admin/reports/student-progress', { params, responseType: 'blob' }).then((r) => r.data as Blob),
  getFinancialSummary: (params: ReportPeriodParams) =>
    api.get<FinancialSummary>('/api/admin/reports/financial-summary', { params }).then((r) => r.data),
  getRevenueBreakdown: (params: ReportPeriodParams) =>
    api.get<RevenueBreakdown>('/api/admin/reports/revenue-breakdown', { params }).then((r) => r.data),
  getExpenseBreakdown: (params: ReportPeriodParams) =>
    api.get<ExpenseBreakdown>('/api/admin/reports/expense-breakdown', { params }).then((r) => r.data),
  exportCsv: (params: ExportCsvParams) =>
    api.get('/api/admin/reports/export-csv', { params, responseType: 'blob' }).then((r) => r.data as Blob),
};
