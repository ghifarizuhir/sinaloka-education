import type {
  ChildSummary,
  AttendanceRecord,
  SessionRecord,
  PaymentRecord,
  EnrollmentRecord,
  ParentProfile,
} from '../types';

export function mapChild(raw: any): ChildSummary {
  return {
    id: raw.id,
    name: raw.name,
    grade: raw.grade,
    status: raw.status,
    enrollment_count: raw.enrollment_count,
    attendance_rate: raw.attendance_rate,
    pending_payments: raw.pending_payments,
    overdue_payments: raw.overdue_payments,
    next_session: raw.next_session
      ? {
          date: new Date(raw.next_session.date).toISOString(),
          start_time: raw.next_session.start_time,
          subject: raw.next_session.subject,
          class_name: raw.next_session.class_name,
        }
      : null,
    enrollments: raw.enrollments ?? [],
  };
}

export function mapAttendance(raw: any): AttendanceRecord {
  return {
    id: raw.id,
    status: raw.status,
    homework_done: raw.homework_done,
    notes: raw.notes ?? null,
    session: {
      date: new Date(raw.session.date).toISOString(),
      start_time: raw.session.start_time,
      end_time: raw.session.end_time,
      class: {
        ...raw.session.class,
        subject: typeof raw.session.class?.subject === 'object' ? raw.session.class.subject.name : raw.session.class?.subject,
      },
    },
  };
}

export function mapSession(raw: any): SessionRecord {
  return {
    id: raw.id,
    date: new Date(raw.date).toISOString(),
    start_time: raw.start_time,
    end_time: raw.end_time,
    status: raw.status,
    topic_covered: raw.topic_covered ?? null,
    session_summary: raw.session_summary ?? null,
    class: {
      ...raw.class,
      subject: typeof raw.class?.subject === 'object' ? raw.class.subject.name : raw.class?.subject,
    },
  };
}

export function mapPayment(raw: any): PaymentRecord {
  const enrollment = raw.enrollment ? {
    ...raw.enrollment,
    class: raw.enrollment.class ? {
      ...raw.enrollment.class,
      subject: typeof raw.enrollment.class.subject === 'object' ? raw.enrollment.class.subject.name : raw.enrollment.class.subject,
    } : raw.enrollment.class,
  } : raw.enrollment;

  return {
    id: raw.id,
    amount: Number(raw.amount),
    due_date: new Date(raw.due_date).toISOString().split('T')[0],
    paid_date: raw.paid_date ? new Date(raw.paid_date).toISOString().split('T')[0] : null,
    status: raw.status,
    method: raw.method ?? null,
    gateway_configured: raw.gateway_configured ?? false,
    enrollment,
  };
}

export function mapEnrollment(raw: any): EnrollmentRecord {
  return {
    id: raw.id,
    status: raw.status,
    class: {
      name: raw.class.name,
      subject: typeof raw.class.subject === 'object' ? raw.class.subject.name : raw.class.subject,
      schedules: raw.class.schedules ?? [],
      fee: Number(raw.class.fee),
      tutor: { user: { name: raw.class.tutor?.user?.name ?? '' } },
    },
  };
}

export function mapProfile(raw: any): ParentProfile {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
  };
}
