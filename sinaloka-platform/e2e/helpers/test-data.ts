let counter = 1;

function nextId(prefix: string): string {
  return `${prefix}-00000000-0000-0000-0000-${String(counter++).padStart(12, '0')}`;
}

export function createMockStudent(overrides: Record<string, unknown> = {}) {
  const id = nextId('stu');
  return {
    id,
    name: 'Test Student',
    email: 'student@example.com',
    phone: '081200000000',
    grade: '10',
    status: 'ACTIVE',
    parent_name: 'Test Parent',
    parent_phone: '081200000001',
    parent_email: 'parent@example.com',
    enrolled_at: '2026-01-15T00:00:00.000Z',
    institution_id: 'inst-00000000-0000-0000-0000-000000000001',
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockTutor(overrides: Record<string, unknown> = {}) {
  const id = nextId('tut');
  const userId = nextId('usr');
  return {
    id,
    user_id: userId,
    name: 'Test Tutor',
    email: 'tutor@example.com',
    avatar_url: null,
    tutor_subjects: [
      { subject: { id: 'sub-00000000-0000-0000-0000-000000000001', name: 'Mathematics' } },
    ],
    experience_years: 3,
    rating: 4.0,
    is_verified: true,
    bank_name: 'BCA',
    bank_account_number: '1234567890',
    bank_account_holder: 'Test Tutor',
    monthly_salary: 3000000,
    user: { id: userId, is_active: true },
    institution_id: 'inst-00000000-0000-0000-0000-000000000001',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockClass(overrides: Record<string, unknown> = {}) {
  const id = nextId('cls');
  return {
    id,
    name: 'Test Class',
    subject_id: 'sub-00000000-0000-0000-0000-000000000001',
    subject: { id: 'sub-00000000-0000-0000-0000-000000000001', name: 'Mathematics' },
    capacity: 20,
    fee: 150000,
    package_fee: null,
    tutor_fee: 75000,
    tutor_fee_mode: 'FIXED_PER_SESSION',
    tutor_fee_per_student: null,
    schedules: [
      { id: nextId('sch'), day: 'Monday', start_time: '09:00', end_time: '10:30' },
    ],
    room: 'Room 101',
    status: 'ACTIVE',
    tutor_id: 'tut-00000000-0000-0000-0000-000000000001',
    enrolled_count: 10,
    tutor: { id: 'tut-00000000-0000-0000-0000-000000000001', name: 'Dewi Lestari' },
    institution_id: 'inst-00000000-0000-0000-0000-000000000001',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockSession(overrides: Record<string, unknown> = {}) {
  const id = nextId('ses');
  return {
    id,
    class_id: 'cls-00000000-0000-0000-0000-000000000001',
    date: '2026-03-25',
    start_time: '09:00',
    end_time: '10:30',
    status: 'SCHEDULED',
    topic_covered: null,
    session_summary: null,
    reschedule_reason: null,
    proposed_date: null,
    proposed_start_time: null,
    proposed_end_time: null,
    created_by_id: 'usr-00000000-0000-0000-0000-000000000001',
    approved_by_id: null,
    class: {
      id: 'cls-00000000-0000-0000-0000-000000000001',
      name: 'Math Advanced',
      subject: 'Mathematics',
      tutor: { id: 'tut-00000000-0000-0000-0000-000000000001', name: 'Dewi Lestari' },
    },
    institution_id: 'inst-00000000-0000-0000-0000-000000000001',
    created_at: '2026-03-20T00:00:00.000Z',
    updated_at: '2026-03-20T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockEnrollment(overrides: Record<string, unknown> = {}) {
  const id = nextId('enr');
  return {
    id,
    student_id: 'stu-00000000-0000-0000-0000-000000000001',
    class_id: 'cls-00000000-0000-0000-0000-000000000001',
    status: 'ACTIVE',
    payment_status: 'PAID',
    enrolled_at: '2026-01-15T00:00:00.000Z',
    student: { id: 'stu-00000000-0000-0000-0000-000000000001', name: 'Rizki Pratama' },
    class: { id: 'cls-00000000-0000-0000-0000-000000000001', name: 'Math Advanced' },
    institution_id: 'inst-00000000-0000-0000-0000-000000000001',
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockPayment(overrides: Record<string, unknown> = {}) {
  const id = nextId('pay');
  return {
    id,
    student_id: 'stu-00000000-0000-0000-0000-000000000001',
    enrollment_id: 'enr-00000000-0000-0000-0000-000000000001',
    amount: 150000,
    due_date: '2026-03-01',
    paid_date: null,
    status: 'PENDING',
    method: null,
    notes: null,
    invoice_number: null,
    invoice_url: null,
    student: { id: 'stu-00000000-0000-0000-0000-000000000001', name: 'Rizki Pratama' },
    enrollment: { id: 'enr-00000000-0000-0000-0000-000000000001', class: { id: 'cls-00000000-0000-0000-0000-000000000001', name: 'Math Advanced' } },
    institution_id: 'inst-00000000-0000-0000-0000-000000000001',
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-02-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockPayout(overrides: Record<string, unknown> = {}) {
  const id = nextId('pyt');
  return {
    id,
    tutor_id: 'tut-00000000-0000-0000-0000-000000000001',
    amount: 450000,
    date: '2026-03-15',
    status: 'PENDING',
    description: 'March payout',
    period_start: '2026-03-01',
    period_end: '2026-03-15',
    proof_url: null,
    slip_url: null,
    tutor: {
      id: 'tut-00000000-0000-0000-0000-000000000001',
      name: 'Dewi Lestari',
      bank_name: 'BCA',
      bank_account_number: '1234567890',
      user: { name: 'Dewi Lestari' },
    },
    institution_id: 'inst-00000000-0000-0000-0000-000000000001',
    created_at: '2026-03-15T00:00:00.000Z',
    updated_at: '2026-03-15T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockExpense(overrides: Record<string, unknown> = {}) {
  const id = nextId('exp');
  return {
    id,
    category: 'SUPPLIES',
    amount: 250000,
    date: '2026-03-10',
    description: 'Office supplies',
    receipt_url: null,
    is_recurring: false,
    recurrence_frequency: null,
    recurrence_end_date: null,
    institution_id: 'inst-00000000-0000-0000-0000-000000000001',
    created_at: '2026-03-10T00:00:00.000Z',
    updated_at: '2026-03-10T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockAttendance(overrides: Record<string, unknown> = {}) {
  const id = nextId('att');
  return {
    id,
    session_id: 'ses-00000000-0000-0000-0000-000000000002',
    student_id: 'stu-00000000-0000-0000-0000-000000000001',
    status: 'PRESENT',
    homework_done: true,
    notes: null,
    student: { id: 'stu-00000000-0000-0000-0000-000000000001', name: 'Rizki Pratama', grade: '10' },
    institution_id: 'inst-00000000-0000-0000-0000-000000000001',
    created_at: '2026-03-22T00:00:00.000Z',
    updated_at: '2026-03-22T00:00:00.000Z',
    ...overrides,
  };
}

export function wrapInPaginatedResponse<T>(data: T[], metaOverrides: Record<string, unknown> = {}) {
  const total = data.length;
  const limit = 20;
  const page = 1;
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      ...metaOverrides,
    },
  };
}
