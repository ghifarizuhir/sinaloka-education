import type { ClassSchedule, Payout, Student, TutorProfile } from '../types';

// --- Status mappings ---

const SESSION_STATUS_MAP: Record<string, ClassSchedule['status']> = {
  SCHEDULED: 'upcoming',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RESCHEDULE_REQUESTED: 'rescheduled',
};

const PAYOUT_STATUS_MAP: Record<string, Payout['status']> = {
  PENDING: 'pending',
  PROCESSING: 'pending',
  PAID: 'paid',
};

const ATTENDANCE_TO_BACKEND: Record<string, string> = {
  P: 'PRESENT',
  A: 'ABSENT',
  L: 'LATE',
};

const ATTENDANCE_FROM_BACKEND: Record<string, 'P' | 'A' | 'L'> = {
  PRESENT: 'P',
  ABSENT: 'A',
  LATE: 'L',
};

// --- Backend → Frontend ---

export function mapSession(raw: any): ClassSchedule {
  return {
    id: raw.id,
    subject: raw.class?.subject ?? '',
    date: new Date(raw.date).toISOString(),
    startTime: raw.start_time,
    endTime: raw.end_time,
    status: SESSION_STATUS_MAP[raw.status] ?? 'upcoming',
    students: [],
    location: raw.class?.room ?? '',
    topicCovered: raw.topic_covered ?? undefined,
    sessionSummary: raw.session_summary ?? undefined,
  };
}

export function mapStudent(raw: any): Student {
  return {
    id: raw.id,
    name: raw.name,
    grade: raw.grade ?? undefined,
    attendance: raw.attendance ? ATTENDANCE_FROM_BACKEND[raw.attendance] : undefined,
    homeworkDone: raw.homework_done ?? false,
    note: raw.notes ?? undefined,
  };
}

export function mapPayout(raw: any): Payout {
  return {
    id: raw.id,
    amount: Number(raw.amount),
    date: new Date(raw.date).toISOString().split('T')[0],
    status: PAYOUT_STATUS_MAP[raw.status] ?? 'pending',
    description: raw.description ?? '',
    proofUrl: raw.proof_url ?? undefined,
  };
}

export function mapProfile(raw: any): TutorProfile {
  return {
    id: raw.id,
    name: raw.user?.name ?? '',
    email: raw.user?.email ?? '',
    tutor_subjects: (raw.tutor_subjects ?? []).map((ts: any) => ({
      subject: { id: ts.subject.id, name: ts.subject.name },
    })),
    rating: raw.rating ?? 0,
    avatar: `https://picsum.photos/seed/${raw.user?.id ?? 'default'}/300/300`,
  };
}

// --- Frontend → Backend ---

export function mapAttendanceToBackend(
  sessionId: string,
  students: Student[],
): { session_id: string; records: any[] } {
  return {
    session_id: sessionId,
    records: students
      .filter((s) => s.attendance !== undefined)
      .map((s) => ({
        student_id: s.id,
        status: ATTENDANCE_TO_BACKEND[s.attendance!],
        homework_done: s.homeworkDone ?? false,
        notes: s.note ?? null,
      })),
  };
}
