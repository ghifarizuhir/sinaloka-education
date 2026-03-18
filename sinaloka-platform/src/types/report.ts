export interface AttendanceReportParams {
  date_from: string;
  date_to: string;
  class_id?: string;
  student_id?: string;
}

export interface FinanceReportParams {
  date_from: string;
  date_to: string;
}

export interface StudentProgressReportParams {
  student_id: string;
  date_from?: string;
  date_to?: string;
}

export interface ReportPeriodParams {
  period_start: string;
  period_end: string;
}

export interface FinancialSummary {
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_payouts: number;
  total_expenses: number;
  net_profit: number;
  payment_count: number;
  payout_count: number;
  expense_count: number;
  revenue_by_month: { month: string; amount: number }[];
}

export interface RevenueBreakdown {
  by_class: { class_id: string; class_name: string; amount: number; payment_count: number }[];
  by_payment_method: { method: string; amount: number; count: number }[];
  by_status: { status: string; amount: number; count: number }[];
}

export interface ExpenseBreakdown {
  by_category: { category: string; amount: number; count: number }[];
  monthly_trend: { month: string; amount: number }[];
}

export interface ExportCsvParams {
  type: 'payments' | 'payouts' | 'expenses';
  period_start: string;
  period_end: string;
}
