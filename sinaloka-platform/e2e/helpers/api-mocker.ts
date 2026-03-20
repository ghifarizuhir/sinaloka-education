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

export async function setupAuthMocks(mockApi: MockApi) {
  await mockApi.onPost('**/api/auth/login').respondWith(200, authData.login);
  await mockApi.onGet('**/api/auth/me').respondWith(200, authData.me);
  await mockApi.onPost('**/api/auth/refresh').respondWith(200, authData.login);
  await mockApi.onPost('**/api/auth/logout').respondWith(200, {});
}

export async function setupStudentMocks(mockApi: MockApi, data = studentsData) {
  // Register wildcard list pattern first (lowest priority) so specific sub-paths can override
  await mockApi.onGet('**/api/admin/students**').respondWith(200, data);
  await mockApi.onPost('**/api/admin/students').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/students/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/students/*').respondWith(200, {});
  // Specific sub-paths registered last so they take precedence over the wildcard
  await mockApi.onGet('**/api/admin/students/export').respondWith(200, 'name,email\n');
  await mockApi.onPost('**/api/admin/students/import').respondWith(200, { imported: 1 });
}

export async function setupTutorMocks(mockApi: MockApi, data = tutorsData) {
  await mockApi.onGet('**/api/admin/tutors**').respondWith(200, data);
  await mockApi.onPost('**/api/admin/tutors').respondWith(201, data.data[0]);
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
  await mockApi.onPost('**/api/admin/enrollments/check-conflict').respondWith(200, { conflict: false });
}

export async function setupSessionMocks(mockApi: MockApi, data = sessionsData) {
  await mockApi.onGet('**/api/admin/sessions**').respondWith(200, data);
  await mockApi.onPost('**/api/admin/sessions').respondWith(201, data.data[0]);
  await mockApi.onPost('**/api/admin/sessions/generate').respondWith(201, { generated: 5 });
  await mockApi.onPatch('**/api/admin/sessions/*').respondWith(200, data.data[0]);
  await mockApi.onPatch('**/api/admin/sessions/*/approve').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/sessions/*').respondWith(200, {});
}

export async function setupPaymentMocks(mockApi: MockApi, data = paymentsData) {
  await mockApi.onGet('**/api/admin/payments**').respondWith(200, data);
  await mockApi.onPost('**/api/admin/payments').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/payments/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/payments/*').respondWith(200, {});
  await mockApi.onGet('**/api/admin/payments/overdue-summary').respondWith(200, { overdue_count: 1, flagged_students: [{ student_id: 'stu-003', student_name: 'Fajar Hidayat', overdue_count: 1 }] });
}

export async function setupPayoutMocks(mockApi: MockApi, data = payoutsData) {
  await mockApi.onGet('**/api/admin/payouts**').respondWith(200, data);
  await mockApi.onPost('**/api/admin/payouts').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/payouts/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/payouts/*').respondWith(200, {});
}

export async function setupAttendanceMocks(mockApi: MockApi, data = attendanceData) {
  // attendance uses ?session_id= query param for filtering
  await mockApi.onGet('**/api/admin/attendance**').respondWith(200, data.data);
  await mockApi.onPatch('**/api/admin/attendance/*').respondWith(200, data.data[0]);
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
  await mockApi.onGet('**/api/admin/payments/overdue-summary').respondWith(200, { overdue_count: 0, flagged_students: [] });
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
}
