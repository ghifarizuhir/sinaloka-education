import { test, expect } from '../../fixtures/auth.fixture';
import { setupEnrollmentMocks, setupStudentMocks, setupClassMocks } from '../../helpers/api-mocker';
import { EnrollmentsPage } from '../../pages/enrollments.page';

test.describe.skip('Enrollment Flow', () => {
  test('enroll student shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    await setupStudentMocks(mockApi);
    await setupClassMocks(mockApi);
    await setupEnrollmentMocks(mockApi);

    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    await enrollmentsPage.createEnrollment('Aisyah Putri', 'Math Advanced');

    await expect(enrollmentsPage.getToast()).toContainText(/enrolled successfully/i);
  });

  test('new enrollment modal shows student and class selection', async ({ authenticatedPage: page, mockApi }) => {
    await setupStudentMocks(mockApi);
    await setupClassMocks(mockApi);
    await setupEnrollmentMocks(mockApi);

    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    await enrollmentsPage.addButton.click();
    await enrollmentsPage.modal.waitFor({ state: 'visible' });

    // Student search input and class list should be visible
    await expect(enrollmentsPage.modal.locator('input[placeholder="Search students..."]')).toBeVisible();

    // Mock data has Aisyah Putri — search and verify student appears
    await enrollmentsPage.modal.locator('input[placeholder="Search students..."]').fill('Aisyah');
    await expect(enrollmentsPage.modal.getByText('Aisyah Putri').first()).toBeVisible();

    // Math Advanced class should appear in the class list
    await expect(enrollmentsPage.modal.getByText('Math Advanced')).toBeVisible();
  });

  test('change enrollment status shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    await setupStudentMocks(mockApi);
    await setupClassMocks(mockApi);
    await setupEnrollmentMocks(mockApi);

    const enrollmentsPage = new EnrollmentsPage(page);
    await enrollmentsPage.goto();

    // Wait for table to load
    await expect(enrollmentsPage.tableRows.first()).toBeVisible();

    await enrollmentsPage.changeStatus('Aisyah Putri', 'DROPPED');

    await expect(enrollmentsPage.getToast()).toContainText(/status updated/i);
  });
});
