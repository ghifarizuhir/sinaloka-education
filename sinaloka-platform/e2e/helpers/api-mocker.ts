import { MockApi } from '../fixtures/mock-api.fixture';
import authData from '../mocks/auth.json';
import studentsData from '../mocks/students.json';
import tutorsData from '../mocks/tutors.json';
import classesData from '../mocks/classes.json';
import enrollmentsData from '../mocks/enrollments.json';
import sessionsData from '../mocks/sessions.json';
import paymentsData from '../mocks/payments.json';
import payoutsData from '../mocks/payouts.json';
import attendanceData from '../mocks/attendance.json';
import expensesData from '../mocks/expenses.json';
import dashboardData from '../mocks/dashboard.json';

export async function setupAuthMocks(mockApi: MockApi) {
  await mockApi.onPost('**/api/auth/login').respondWith(200, authData.login);
  await mockApi.onGet('**/api/auth/me').respondWith(200, authData.me);
  await mockApi.onPost('**/api/auth/refresh').respondWith(200, authData.login);
  await mockApi.onPost('**/api/auth/logout').respondWith(200, {});
}

export async function setupStudentMocks(mockApi: MockApi, data = studentsData) {
  await mockApi.onGet('**/api/admin/students').respondWith(200, data);
  await mockApi.onPost('**/api/admin/students').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/students/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/students/*').respondWith(200, {});
  await mockApi.onGet('**/api/admin/students/export').respondWith(200, 'name,email\n');
  await mockApi.onPost('**/api/admin/students/import').respondWith(200, { imported: 1 });
}

export async function setupTutorMocks(mockApi: MockApi, data = tutorsData) {
  await mockApi.onGet('**/api/admin/tutors').respondWith(200, data);
  await mockApi.onPost('**/api/admin/tutors').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/tutors/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/tutors/*').respondWith(200, {});
}

export async function setupClassMocks(mockApi: MockApi, data = classesData) {
  await mockApi.onGet('**/api/admin/classes').respondWith(200, data);
  await mockApi.onPost('**/api/admin/classes').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/classes/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/classes/*').respondWith(200, {});
}

export async function setupEnrollmentMocks(mockApi: MockApi, data = enrollmentsData) {
  await mockApi.onGet('**/api/admin/enrollments').respondWith(200, data);
  await mockApi.onPost('**/api/admin/enrollments').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/enrollments/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/enrollments/*').respondWith(200, {});
  await mockApi.onPost('**/api/admin/enrollments/check-conflict').respondWith(200, { conflict: false });
}

export async function setupSessionMocks(mockApi: MockApi, data = sessionsData) {
  await mockApi.onGet('**/api/admin/sessions').respondWith(200, data);
  await mockApi.onPost('**/api/admin/sessions').respondWith(201, data.data[0]);
  await mockApi.onPost('**/api/admin/sessions/generate').respondWith(201, { generated: 5 });
  await mockApi.onPatch('**/api/admin/sessions/*').respondWith(200, data.data[0]);
  await mockApi.onPatch('**/api/admin/sessions/*/approve').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/sessions/*').respondWith(200, {});
}

export async function setupPaymentMocks(mockApi: MockApi, data = paymentsData) {
  await mockApi.onGet('**/api/admin/payments').respondWith(200, data);
  await mockApi.onPost('**/api/admin/payments').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/payments/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/payments/*').respondWith(200, {});
}

export async function setupPayoutMocks(mockApi: MockApi, data = payoutsData) {
  await mockApi.onGet('**/api/admin/payouts').respondWith(200, data);
  await mockApi.onPost('**/api/admin/payouts').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/payouts/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/payouts/*').respondWith(200, {});
}

export async function setupAttendanceMocks(mockApi: MockApi, data = attendanceData) {
  await mockApi.onGet('**/api/admin/attendance').respondWith(200, data);
  await mockApi.onPatch('**/api/admin/attendance/*').respondWith(200, data.data[0]);
}

export async function setupExpenseMocks(mockApi: MockApi, data = expensesData) {
  await mockApi.onGet('**/api/admin/expenses').respondWith(200, data);
  await mockApi.onPost('**/api/admin/expenses').respondWith(201, data.data[0]);
  await mockApi.onPatch('**/api/admin/expenses/*').respondWith(200, data.data[0]);
  await mockApi.onDelete('**/api/admin/expenses/*').respondWith(200, {});
}

export async function setupDashboardMocks(mockApi: MockApi, data = dashboardData) {
  await mockApi.onGet('**/api/admin/dashboard/stats').respondWith(200, data.stats);
  await mockApi.onGet('**/api/admin/dashboard/activity').respondWith(200, data.activity);
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
