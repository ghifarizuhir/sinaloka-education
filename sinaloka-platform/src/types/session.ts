import type { PaginationParams } from './common';

export type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULE_REQUESTED';

export interface Session {
  id: string;
  class_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: SessionStatus;
  topic_covered: string | null;
  session_summary: string | null;
  reschedule_reason: string | null;
  proposed_date: string | null;
  proposed_start_time: string | null;
  proposed_end_time: string | null;
  class?: { id: string; name: string; subject: string; tutor?: { id: string; name: string } };
  created_by_id: string | null;
  approved_by_id: string | null;
  institution_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionDto {
  class_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status?: SessionStatus;
  topic_covered?: string;
  session_summary?: string;
}

export interface UpdateSessionDto {
  date?: string;
  start_time?: string;
  end_time?: string;
  status?: SessionStatus;
  topic_covered?: string;
  session_summary?: string;
}

export interface GenerateSessionsDto {
  class_id: string;
  date_from: string;
  date_to: string;
}

export interface ApproveRescheduleDto {
  approved: boolean;
}

export interface SessionQueryParams extends PaginationParams {
  class_id?: string;
  status?: SessionStatus;
  date_from?: string;
  date_to?: string;
}

export interface SessionStudent {
  id: string;
  name: string;
  grade: string | null;
  attendance_id: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | null;
  homework_done: boolean;
  notes: string | null;
}

export interface GenerateSessionsResponse {
  count: number;
  sessions: Session[];
}

export interface SessionDetail extends Session {
  class?: {
    id: string;
    name: string;
    subject: string;
    fee: number;
    tutor?: { id: string; name: string; email?: string };
  };
  attendances?: {
    id: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE';
    homework_done: boolean;
    notes: string | null;
    student: { id: string; name: string; grade: string };
  }[];
}
