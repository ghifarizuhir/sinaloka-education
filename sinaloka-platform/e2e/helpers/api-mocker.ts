import { createRequire } from 'module';
import { MockApi } from '../fixtures/mock-api.fixture';

const require = createRequire(import.meta.url);
const authData = require('../mocks/auth.json');
const studentsData = require('../mocks/students.json');
const tutorsData = require('../mocks/tutors.json');
const classesData = require('../mocks/classes.json');
const enrollmentsData = require('../mocks/enrollments.json');
const sessionsData = require('../mocks/sessions.json');
const paymentsData = require('../mocks/payments.json');
const payoutsData = require('../mocks/payouts.json');
const attendanceData = require('../mocks/attendance.json');
const expensesData = require('../mocks/expenses.json');
const dashboardData = require('../mocks/dashboard.json');
const subjectsData = require('../mocks/subjects.json');
const settingsData = require('../mocks/settings.json');

export async function setupAuthMocks(mockApi: MockApi) {
  await mockApi.onPost('**/api/auth/login').respondWith(200, authData.login);
  await mockApi.onGet('**/api/auth/me').respondWith(200, authData.me);
  await mockApi.onPost('**/api/auth/refresh').respondWith(200, authData.login);
  await mockApi.onPost('**/api/auth/logout').respondWith(200, {});
}

export async function setupStudentMocks(mockApi: MockApi, data = studentsData) {
  await mockApi.onGet('**/api/admin/students**').respondWith(200, data);
  await mockApi.onPost('**/api/admin/students').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/students/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/students/*').respondWith(200, {});
  await mockApi.onGet('**/api/admin/students/export').respondWith(200, 'name,email\n');
  await mockApi.onPost('**/api/admin/students/import').respondWith(200, { imported: 1 });
}

export async function setupTutorMocks(mockApi: MockApi, data = tutorsData) {
  await mockApi.onGet('**/api/admin/tutors**').respondWith(200, data);
  await mockApi.onPost('**/api/admin/tutors/invite').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/tutors/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/tutors/*').respondWith(200, {});
}

export async function setupClassMocks(mockApi: MockApi, data = classesData) {
  await mockApi.onGet('**/api/admin/classes**').respondWith(200, data);
  await mockApi.onPost('**/api/admin/classes').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/classes/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/classes/*').respondWith(200, {});
}

export async function setupEnrollmentMocks(mockApi: MockApi, data = enrollmentsData) {
  await mockApi.onGet('**/api/admin/enrollments**').respondWith(200, data);
  await mockApi.onPost('**/api/admin/enrollments').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/enrollments/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/enrollments/*').respondWith(200, {});
  await mockApi.onPost('**/api/admin/enrollments/check-conflict').respondWith(200, { has_conflict: false });
}

export async function setupSessionMocks(mockApi: MockApi, data = sessionsData) {
  await mockApi.onGet('**/api/admin/sessions**').respondWith(200, data);
  await mockApi.onPost('**/api/admin/sessions').respondWith(201, data.data[0]);
  await mockApi.onPost('**/api/admin/sessions/generate').respondWith(201, { generated: 5 });
  await mockApi.onPatch('**/api/admin/sessions/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/sessions/*').respondWith(200, {});
  await mockApi.onGet('**/api/admin/sessions/*/students').respondWith(200, {
    students: [
      { id: 'stu-00000000-0000-0000-0000-000000000001', name: 'Rizki Pratama', grade: '10', attendance_id: 'att-00000000-0000-0000-0000-000000000001' },
      { id: 'stu-00000000-0000-0000-0000-000000000002', name: 'Aisyah Putri', grade: '11', attendance_id: 'att-00000000-0000-0000-0000-000000000002' },
      { id: 'stu-00000000-0000-0000-0000-000000000003', name: 'Fajar Hidayat', grade: '10', attendance_id: 'att-00000000-0000-0000-0000-000000000003' },
    ],
  });
}

export async function setupPaymentMocks(mockApi: MockApi, data = paymentsData) {
  await mockApi.onGet('**/api/admin/payments**').respondWith(200, data);
  await mockApi.onPatch('**/api/admin/payments/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/payments/*').respondWith(200, {});
  await mockApi.onGet('**/api/admin/payments/overdue-summary').respondWith(200, {
    overdue_count: 1,
    total_overdue_amount: 120000,
    flagged_students: [{ student_id: 'stu-00000000-0000-0000-0000-000000000003', student_name: 'Fajar Hidayat', overdue_count: 1 }],
  });
}

export async function setupPayoutMocks(mockApi: MockApi, data = payoutsData) {
  await mockApi.onGet('**/api/admin/payouts**').respondWith(200, data);
  await mockApi.onPost('**/api/admin/payouts').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/payouts/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/payouts/*').respondWith(200, {});
}

export async function setupAttendanceMocks(mockApi: MockApi, data = attendanceData) {
  await mockApi.onGet('**/api/admin/attendance**').respondWith(200, data.data);
  await mockApi.onPatch('**/api/admin/attendance/*').respondWith(200, data.data[0]);
  await mockApi.onGet('**/api/admin/sessions/*/students').respondWith(200, {
    students: [
      { id: 'stu-00000000-0000-0000-0000-000000000001', name: 'Rizki Pratama', grade: '10', attendance_id: 'att-00000000-0000-0000-0000-000000000001' },
      { id: 'stu-00000000-0000-0000-0000-000000000002', name: 'Aisyah Putri', grade: '11', attendance_id: 'att-00000000-0000-0000-0000-000000000002' },
      { id: 'stu-00000000-0000-0000-0000-000000000003', name: 'Fajar Hidayat', grade: '10', attendance_id: 'att-00000000-0000-0000-0000-000000000003' },
    ],
  });
  await mockApi.onGet('**/api/admin/attendance/summary**').respondWith(200, {
    rate: 66.7,
    present: 1,
    absent: 1,
    late: 1,
  });
}

export async function setupExpenseMocks(mockApi: MockApi, data = expensesData) {
  await mockApi.onGet('**/api/admin/expenses**').respondWith(200, data);
  await mockApi.onPost('**/api/admin/expenses').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/expenses/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/expenses/*').respondWith(200, {});
}

export async function setupDashboardMocks(mockApi: MockApi, data = dashboardData) {
  await mockApi.onGet('**/api/admin/dashboard/stats').respondWith(200, data.stats);
  await mockApi.onGet('**/api/admin/dashboard/activity').respondWith(200, data.activity);
  await mockApi.onGet('**/api/admin/dashboard/upcoming-sessions').respondWith(200, data.upcoming_sessions_list);
  await mockApi.onGet('**/api/admin/dashboard/attendance-trend').respondWith(200, data.attendance_trend);
  await mockApi.onGet('**/api/admin/dashboard/student-growth').respondWith(200, data.student_growth);
  await mockApi.onGet('**/api/admin/dashboard/revenue-expenses').respondWith(200, data.revenue_expenses);
  await mockApi.onGet('**/api/admin/payments/overdue-summary').respondWith(200, {
    overdue_count: 1,
    total_overdue_amount: 120000,
    flagged_students: [{ student_id: 'stu-00000000-0000-0000-0000-000000000003', student_name: 'Fajar Hidayat', overdue_count: 1 }],
  });
}

export async function setupSubjectMocks(mockApi: MockApi, data = subjectsData) {
  await mockApi.onGet('**/api/admin/subjects**').respondWith(200, data);
  await mockApi.onGet('**/api/admin/subjects/*/tutors').respondWith(200, {
    data: [
      { id: 'tut-00000000-0000-0000-0000-000000000001', name: 'Dewi Lestari' },
    ],
  });
}

export async function setupSettingsMocks(mockApi: MockApi, data = settingsData) {
  await mockApi.onGet('**/api/admin/settings/general').respondWith(200, data.general);
  await mockApi.onPatch('**/api/admin/settings/general').respondWith(200, data.general);
  await mockApi.onGet('**/api/admin/settings/billing').respondWith(200, data.billing);
  await mockApi.onPatch('**/api/admin/settings/billing').respondWith(200, data.billing);
  await mockApi.onGet('**/api/admin/settings/academic').respondWith(200, data.academic);
  await mockApi.onPatch('**/api/admin/settings/academic').respondWith(200, data.academic);
  await mockApi.onPost('**/api/admin/settings/change-password').respondWith(200, {});
  await mockApi.onGet('**/api/admin/subjects**').respondWith(200, subjectsData);
  await mockApi.onPost('**/api/admin/subjects').respondWith(201, subjectsData.data[0]);
  await mockApi.onDelete('**/api/admin/subjects/*').respondWith(200, {});
  await mockApi.onGet('**/api/admin/settings/registration').respondWith(200, data.registration);
  await mockApi.onPatch('**/api/admin/settings/registration').respondWith(200, data.registration);
}

export async function setupFinanceOverviewMocks(mockApi: MockApi) {
  await mockApi.onGet('**/api/admin/finance/financial-summary**').respondWith(200, {
    total_revenue: 12500000,
    total_payouts: 750000,
    total_expenses: 5250000,
    net_profit: 6500000,
  });
  await mockApi.onGet('**/api/admin/finance/revenue-breakdown**').respondWith(200, {
    by_class: [{ class_name: 'Math Advanced', amount: 7500000 }],
    by_method: [{ method: 'TRANSFER', amount: 8000000 }],
  });
  await mockApi.onGet('**/api/admin/finance/expense-breakdown**').respondWith(200, {
    by_category: [
      { category: 'RENT', amount: 5000000 },
      { category: 'SUPPLIES', amount: 250000 },
    ],
  });
  await mockApi.onGet('**/api/admin/payments/overdue-summary').respondWith(200, {
    overdue_count: 1,
    total_overdue_amount: 120000,
    flagged_students: [{ student_id: 'stu-00000000-0000-0000-0000-000000000003', student_name: 'Fajar Hidayat', overdue_count: 1 }],
  });
}

export async function setupReportMocks(mockApi: MockApi) {
  const fakePdf = Buffer.from('fake-pdf-content');
  await mockApi.onGet('**/api/admin/reports/finance**').respondWith(200, fakePdf);
  await mockApi.onGet('**/api/admin/reports/attendance**').respondWith(200, fakePdf);
  await mockApi.onGet('**/api/admin/reports/student-progress**').respondWith(200, fakePdf);
}

export async function setupAllMocks(mockApi: MockApi) {
  await setupAuthMocks(mockApi);
  await setupStudentMocks(mockApi);
  await setupTutorMocks(mockApi);
  await setupClassMocks(mockApi);
  await setupEnrollmentMocks(mockApi);
  await setupSessionMocks(mockApi);
  await setupPaymentMocks(mockApi);
  await setupPayoutMocks(mockApi);
  await setupAttendanceMocks(mockApi);
  await setupExpenseMocks(mockApi);
  await setupDashboardMocks(mockApi);
  await setupSubjectMocks(mockApi);
  await setupSettingsMocks(mockApi);
  await setupFinanceOverviewMocks(mockApi);
  await setupReportMocks(mockApi);
}
