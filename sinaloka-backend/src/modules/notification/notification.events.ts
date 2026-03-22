export const NOTIFICATION_EVENTS = {
  PAYMENT_RECEIVED: 'payment.received',
  STUDENT_REGISTERED: 'student.registered',
  PARENT_REGISTERED: 'parent.registered',
  SESSION_CREATED: 'session.created',
  SESSION_CANCELLED: 'session.cancelled',
  ATTENDANCE_SUBMITTED: 'attendance.submitted',
  TUTOR_INVITE_ACCEPTED: 'tutor.invite_accepted',
} as const;

export interface PaymentReceivedEvent {
  institutionId: string;
  paymentId: string;
  studentName: string;
  amount: number;
}

export interface StudentRegisteredEvent {
  institutionId: string;
  studentId: string;
  studentName: string;
}

export interface ParentRegisteredEvent {
  institutionId: string;
  parentId: string;
  parentName: string;
  studentNames: string[];
}

export interface SessionCreatedEvent {
  institutionId: string;
  sessionId: string;
  className: string;
  date: string;
}

export interface SessionCancelledEvent {
  institutionId: string;
  sessionId: string;
  className: string;
  date: string;
  reason?: string;
}

export interface AttendanceSubmittedEvent {
  institutionId: string;
  sessionId: string;
  className: string;
  tutorName: string;
  studentCount: number;
}

export interface TutorInviteAcceptedEvent {
  institutionId: string;
  tutorId: string;
  tutorName: string;
}
