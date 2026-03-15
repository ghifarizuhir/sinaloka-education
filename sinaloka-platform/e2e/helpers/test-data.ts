export function createMockStudent(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, name: 'Aisyah Putri', email: 'aisyah@example.com', phone: '+62812345678',
    grade: '10th Grade', status: 'ACTIVE', parent_name: 'Budi Santoso',
    parent_phone: '+62898765432', parent_email: 'budi@example.com',
    enrolled_at: '2026-01-15', created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-01-15T08:00:00Z', institution_id: 1, ...overrides,
  };
}

export function createMockTutor(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, name: 'Dewi Lestari', email: 'dewi@sinaloka.com',
    subjects: ['Mathematics', 'Physics'], experience_years: 5, rating: 4.8,
    is_verified: true, bank_name: 'BCA', bank_account_number: '1234567890',
    bank_account_holder: 'Dewi Lestari', availability: {}, user_id: 2,
    institution_id: 1, created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-01-10T08:00:00Z', ...overrides,
  };
}

export function createMockClass(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, name: 'Math Advanced', subject: 'Mathematics', capacity: 20, fee: 500000,
    schedule_days: ['Monday', 'Wednesday'], schedule_start_time: '09:00',
    schedule_end_time: '10:30', room: 'Room A', status: 'ACTIVE', tutor_id: 1,
    tutor: { id: 1, name: 'Dewi Lestari' }, institution_id: 1,
    created_at: '2026-01-05T08:00:00Z', updated_at: '2026-01-05T08:00:00Z', ...overrides,
  };
}

export function createMockEnrollment(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, student_id: 1, class_id: 1, status: 'ACTIVE', payment_status: 'PAID',
    enrolled_at: '2026-01-15T08:00:00Z',
    student: { id: 1, name: 'Aisyah Putri' },
    class: { id: 1, name: 'Math Advanced', subject: 'Mathematics' },
    institution_id: 1, created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-01-15T08:00:00Z', ...overrides,
  };
}

export function createMockSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, class_id: 1, date: '2026-03-15', start_time: '09:00', end_time: '10:30',
    status: 'SCHEDULED', topic_covered: null, session_summary: null,
    reschedule_reason: null,
    class: { id: 1, name: 'Math Advanced', subject: 'Mathematics',
      tutor: { id: 1, name: 'Dewi Lestari' } },
    created_at: '2026-03-01T08:00:00Z', updated_at: '2026-03-01T08:00:00Z', ...overrides,
  };
}

export function createMockPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, student_id: 1, enrollment_id: 1, amount: 500000, due_date: '2026-03-01',
    paid_date: null, status: 'PENDING', method: null, notes: null,
    student: { id: 1, name: 'Aisyah Putri' },
    enrollment: { id: 1, class: { id: 1, name: 'Math Advanced' } },
    created_at: '2026-02-15T08:00:00Z', updated_at: '2026-02-15T08:00:00Z', ...overrides,
  };
}

export function createMockAttendance(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, session_id: 1, student_id: 1, status: 'PRESENT', homework_done: false,
    notes: null, student: { id: 1, name: 'Aisyah Putri' },
    session: { id: 1, date: '2026-03-15' }, ...overrides,
  };
}

export function createMockDashboardStats(overrides: Record<string, unknown> = {}) {
  return {
    total_students: 150, active_tutors: 12, total_revenue: 75000000,
    attendance_rate: 92.5, upcoming_sessions: 8, ...overrides,
  };
}

export function createMockActivity(overrides: Record<string, unknown> = {}) {
  return {
    type: 'enrollment', description: 'Aisyah Putri enrolled in Math Advanced',
    created_at: '2026-03-15T10:00:00Z', ...overrides,
  };
}

export function paginatedResponse<T>(data: T[], page = 1, limit = 10) {
  return {
    data, meta: { page, limit, total: data.length,
      total_pages: Math.ceil(data.length / limit) },
  };
}
