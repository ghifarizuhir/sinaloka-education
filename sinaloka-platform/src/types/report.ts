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
