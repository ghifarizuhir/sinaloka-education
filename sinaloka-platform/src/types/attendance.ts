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

export interface StudentAttendanceSummary {
  total_sessions: number;
  present: number;
  absent: number;
  late: number;
  attendance_rate: number;
}

export interface StudentAttendanceRecord {
  id: string;
  session_id: string;
  status: AttendanceStatus;
  homework_done: boolean;
  notes: string | null;
  session: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
    class: { id: string; name: string };
  };
}

export interface StudentAttendanceResponse {
  summary: StudentAttendanceSummary;
  records: StudentAttendanceRecord[];
}

export interface StudentAttendanceParams {
  date_from: string;
  date_to: string;
}
