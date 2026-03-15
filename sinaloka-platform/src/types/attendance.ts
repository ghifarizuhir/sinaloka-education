export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export interface Attendance {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  homework_done: boolean;
  notes: string | null;
  student?: { id: string; name: string; grade: string };
  session?: { id: string; date: string; class?: { id: string; name: string } };
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateAttendanceDto {
  status?: AttendanceStatus;
  homework_done?: boolean;
  notes?: string;
}

export interface AttendanceQueryParams {
  session_id: string;
}

export interface AttendanceSummaryParams {
  class_id: string;
  date_from: string;
  date_to: string;
}
