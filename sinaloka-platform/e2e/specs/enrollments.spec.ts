import { test, expect } from '../../e2e/fixtures/mock-api.fixture';
import {
  setupAuthMocks,
  setupEnrollmentMocks,
  setupStudentMocks,
  setupClassMocks,
} from '../helpers/api-mocker';
import { EnrollmentsPage } from '../pages/enrollments.page';

test.describe('Enrollments', () => {
  let enrollments: EnrollmentsPage;

  test.beforeEach(async ({ mockApi, authedPage }) => {
    await setupAuthMocks(mockApi);
    await setupEnrollmentMocks(mockApi);
    await setupStudentMocks(mockApi);
    await setupClassMocks(mockApi);
    await mockApi.onGet('**/api/admin/payments/overdue-summary').respondWith(200, {
      overdue_count: 0,
      flagged_students: [],
    });
    enrollments = new EnrollmentsPage(authedPage);
  });

  // ── Smoke ──

  test('table loads with enrollments', async () => {
    await enrollments.goto();
    await expect(enrollments.table).toBeVisible();
    await expect(enrollments.rows).toHaveCount(3);
  });

  test('search by student name', async () => {
    await enrollments.goto();
    await enrollments.search('Rizki');
    await expect(enrollments.searchInput).toHaveValue('Rizki');
    await expect(enrollments.getRowByName('Rizki Pratama')).toBeVisible();
  });

  test('payment status badges shown', async () => {
    await enrollments.goto();
    const paidRow = enrollments.getRowByName('Rizki Pratama');
    await expect(paidRow).toContainText('Paid');
    const pendingRow = enrollments.getRowByName('Aisyah Putri');
    await expect(pendingRow).toContainText('Pending');
  });

  // ── CRUD ──

  test('enroll student', async () => {
    await enrollments.goto();
    await enrollments.enrollStudent('Rizki Pratama', 'Physics Basic');
    await expect(enrollments.getToast()).toBeVisible();
  });

  test('change enrollment status', async () => {
    await enrollments.goto();
    await enrollments.changeStatus('Aisyah Putri', 'ACTIVE');
    await expect(enrollments.getToast()).toBeVisible();
  });

  test('delete enrollment', async () => {
    await enrollments.goto();
    await enrollments.deleteEnrollment('Fajar Hidayat');
    await expect(enrollments.getToast()).toBeVisible();
  });

  // ── Negative ──

  test('enroll without student disabled', async ({ authedPage }) => {
    await enrollments.goto();
    await enrollments.addButton.click();
    const modal = authedPage.getByRole('dialog');
    // Enroll button should be disabled before selecting a student
    const enrollBtn = modal.getByRole('button', { name: /enroll/i });
    await expect(enrollBtn).toBeDisabled();
  });

  test('conflict shows warning', async ({ mockApi }) => {
    // Override check-conflict to return a conflict
    await mockApi.onPost('**/api/admin/enrollments/check-conflict').respondWith(200, {
      has_conflict: true,
      conflicting_students: ['Rizki Pratama'],
    });
    await enrollments.goto();
    await enrollments.enrollStudent('Rizki Pratama', 'Physics Basic');
    // Conflict warning should be visible as a toast
    await expect(enrollments.getToast()).toBeVisible();
  });
});
