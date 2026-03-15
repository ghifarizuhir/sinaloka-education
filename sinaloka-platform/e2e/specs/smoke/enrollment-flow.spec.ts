import { test, expect } from '../../fixtures/auth.fixture';
import { setupEnrollmentMocks, setupStudentMocks, setupClassMocks } from '../../helpers/api-mocker';
import { EnrollmentsPage } from '../../pages/enrollments.page';

test.describe('Enrollment Flow', () => {
  test('enroll student shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    await setupStudentMocks(mockApi);
    await setupClassMocks(mockApi);
    await setupEnrollmentMocks(mockApi);

    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    await enrollmentsPage.createEnrollment('Aisyah Putri', 'Math Advanced');

    await expect(enrollmentsPage.getToast()).toBeVisible();
  });

  test('conflict detection shows warning when conflict exists', async ({ authenticatedPage: page, mockApi }) => {
    await setupStudentMocks(mockApi);
    await setupClassMocks(mockApi);
    await setupEnrollmentMocks(mockApi);

    // Override check-conflict to return conflict: true
    await mockApi.onPost('**/api/admin/enrollments/check-conflict').respondWith(200, { conflict: true, message: 'Schedule conflict detected' });

    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    await enrollmentsPage.addButton.click();
    await enrollmentsPage.modal.waitFor({ state: 'visible' });

    // Fill student and class selection to trigger conflict check
    await enrollmentsPage.modal.locator('input[placeholder="Search students..."]').fill('Aisyah');
    await enrollmentsPage.modal.getByText('Aisyah Putri').first().click();
    await enrollmentsPage.modal.getByText('Math Advanced').click();

    // Conflict warning should appear
    await expect(enrollmentsPage.modal.getByText(/conflict/i)).toBeVisible();
  });

  test('change enrollment status shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    await setupStudentMocks(mockApi);
    await setupClassMocks(mockApi);
    await setupEnrollmentMocks(mockApi);

    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    // Wait for table to load
    await expect(enrollmentsPage.tableRows.first()).toBeVisible();

    await enrollmentsPage.changeStatus('Aisyah Putri', 'INACTIVE');

    await expect(enrollmentsPage.getToast()).toBeVisible();
  });
});
