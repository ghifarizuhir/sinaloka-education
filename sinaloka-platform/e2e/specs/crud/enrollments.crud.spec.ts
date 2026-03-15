import { test, expect } from '../../fixtures/auth.fixture';
import { setupEnrollmentMocks, setupStudentMocks, setupClassMocks } from '../../helpers/api-mocker';
import { EnrollmentsPage } from '../../pages/enrollments.page';

test.describe('Enrollments CRUD', () => {
  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupStudentMocks(mockApi);
    await setupClassMocks(mockApi);
    await setupEnrollmentMocks(mockApi);
  });

  // ── Create ──────────────────────────────────────────────────────────────

  test('create enrollment shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    await enrollmentsPage.createEnrollment('Aisyah Putri', 'Math Advanced');

    await expect(enrollmentsPage.getToast()).toBeVisible();
  });

  test('create enrollment for second student shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    await enrollmentsPage.createEnrollment('Rizki Pratama', 'Physics Basic');

    await expect(enrollmentsPage.getToast()).toBeVisible();
  });

  // ── Read / List ──────────────────────────────────────────────────────────

  test('enrollment table loads with data', async ({ authenticatedPage: page, mockApi }) => {
    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    await expect(enrollmentsPage.table).toBeVisible();
    await expect(enrollmentsPage.tableRows.first()).toBeVisible();

    await expect(enrollmentsPage.getRowByName('Aisyah Putri')).toBeVisible();
    await expect(enrollmentsPage.getRowByName('Rizki Pratama')).toBeVisible();
  });

  test('payment status is displayed per enrollment', async ({ authenticatedPage: page, mockApi }) => {
    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    await expect(enrollmentsPage.tableRows.first()).toBeVisible();

    // Aisyah = PAID, Rizki = PENDING
    const aisyahRow = enrollmentsPage.getRowByName('Aisyah Putri');
    await expect(aisyahRow.getByText(/paid/i)).toBeVisible();

    const rizkiRow = enrollmentsPage.getRowByName('Rizki Pratama');
    await expect(rizkiRow.getByText(/pending/i)).toBeVisible();
  });

  // ── Status Changes ────────────────────────────────────────────────────────

  test('change enrollment status to ACTIVE shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    await expect(enrollmentsPage.tableRows.first()).toBeVisible();

    await enrollmentsPage.changeStatus('Rizki Pratama', 'ACTIVE');

    await expect(enrollmentsPage.getToast()).toBeVisible();
  });

  test('change enrollment status to TRIAL shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    await expect(enrollmentsPage.tableRows.first()).toBeVisible();

    await enrollmentsPage.changeStatus('Aisyah Putri', 'TRIAL');

    await expect(enrollmentsPage.getToast()).toBeVisible();
  });

  test('change enrollment status to WAITLISTED shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    await expect(enrollmentsPage.tableRows.first()).toBeVisible();

    await enrollmentsPage.changeStatus('Aisyah Putri', 'WAITLISTED');

    await expect(enrollmentsPage.getToast()).toBeVisible();
  });

  test('change enrollment status to DROPPED shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    await expect(enrollmentsPage.tableRows.first()).toBeVisible();

    await enrollmentsPage.changeStatus('Aisyah Putri', 'DROPPED');

    await expect(enrollmentsPage.getToast()).toBeVisible();
  });

  // ── Search ───────────────────────────────────────────────────────────────

  test('search enrollment by student name filters results', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    await expect(enrollmentsPage.tableRows.first()).toBeVisible();

    await enrollmentsPage.search('Aisyah');

    await expect(enrollmentsPage.getRowByName('Aisyah Putri')).toBeVisible();
    await expect(enrollmentsPage.tableRows).toHaveCount(1);
  });

  test('search enrollment by class name filters results', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    await expect(enrollmentsPage.tableRows.first()).toBeVisible();

    await enrollmentsPage.search('Physics');

    await expect(enrollmentsPage.getRowByName('Rizki Pratama')).toBeVisible();
    await expect(enrollmentsPage.tableRows).toHaveCount(1);
  });

  // ── Conflict Edge Case ────────────────────────────────────────────────────

  test('conflict detection shows warning when schedule conflict exists', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    // Override conflict check to return conflict: true
    await mockApi
      .onPost('**/api/admin/enrollments/check-conflict')
      .respondWith(200, { conflict: true, message: 'Schedule conflict detected' });

    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    await enrollmentsPage.addButton.click();
    await enrollmentsPage.modal.waitFor({ state: 'visible' });

    await enrollmentsPage.modal.locator('input[placeholder="Search students..."]').fill('Aisyah');
    await enrollmentsPage.modal.getByText('Aisyah Putri').first().click();
    await enrollmentsPage.modal.getByText('Math Advanced').click();

    await expect(enrollmentsPage.modal.getByText(/conflict/i)).toBeVisible();
  });

  test('no conflict check passes and modal proceeds', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    // Default setup already has conflict: false — confirm no conflict message appears
    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    await enrollmentsPage.addButton.click();
    await enrollmentsPage.modal.waitFor({ state: 'visible' });

    await enrollmentsPage.modal.locator('input[placeholder="Search students..."]').fill('Aisyah');
    await enrollmentsPage.modal.getByText('Aisyah Putri').first().click();
    await enrollmentsPage.modal.getByText('Math Advanced').click();

    // No conflict message should appear
    await expect(enrollmentsPage.modal.getByText(/conflict/i)).not.toBeVisible();
  });

  // ── Delete ───────────────────────────────────────────────────────────────

  test('delete enrollment with confirmation shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    await expect(enrollmentsPage.tableRows.first()).toBeVisible();

    await enrollmentsPage.deleteEnrollment('Aisyah Putri');

    await expect(enrollmentsPage.getToast()).toBeVisible();
  });
});
