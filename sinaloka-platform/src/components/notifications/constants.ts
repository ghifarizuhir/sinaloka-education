export const NOTIFICATION_DEEP_LINKS: Record<string, () => string> = {
  'payment.received': () => '/finance/payments',
  'student.registered': () => '/students',
  'parent.registered': () => '/students',
  'session.created': () => '/schedules',
  'session.cancelled': () => '/schedules',
  'attendance.submitted': () => '/attendance',
  'tutor.invite_accepted': () => '/tutors',
};
