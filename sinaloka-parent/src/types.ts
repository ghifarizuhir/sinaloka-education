export interface ChildSummary {
  id: string;
  name: string;
  grade: string;
  status: string;
  enrollment_count: number;
  attendance_rate: number;
  pending_payments: number;
  overdue_payments: number;
  next_session: {
    date: string;
    start_time: string;
    subject: string;
    class_name: string;
  } | null;
  enrollments: { class_name: string; subject: string }[];
}

export interface AttendanceRecord {
  id: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  homework_done: boolean;
  notes: string | null;
  session: {
    date: string;
    start_time: string;
    end_time: string;
    class: { name: string; subject: string };
  };
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  homework_done: number;
  attendance_rate: number;
  homework_rate: number;
}

export interface SessionRecord {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  topic_covered: string | null;
  session_summary: string | null;
  class: { name: string; subject: string };
}

export interface PaymentRecord {
  id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  method: string | null;
  enrollment: {
    class: { name: string; subject: string };
  };
}

export interface EnrollmentRecord {
  id: string;
  status: string;
  class: {
    name: string;
    subject: string;
    schedules: { day: string; start_time: string; end_time: string }[];
    fee: number;
    tutor: { user: { name: string } };
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ParentProfile {
  id: string;
  name: string;
  email: string;
}
