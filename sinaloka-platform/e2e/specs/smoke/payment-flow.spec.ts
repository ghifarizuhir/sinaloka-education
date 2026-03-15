import { test, expect } from '../../fixtures/auth.fixture';
import { setupPaymentMocks } from '../../helpers/api-mocker';
import { StudentPaymentsPage } from '../../pages/student-payments.page';

test.describe('Payment Flow', () => {
  test('record payment shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    await setupPaymentMocks(mockApi);

    const paymentsPage = new StudentPaymentsPage(page);
    await paymentsPage.goto();

    // Wait for the table to load
    await expect(paymentsPage.tableRows.first()).toBeVisible();

    // Rizki Pratama has PENDING status, so the Record Payment button is visible
    await paymentsPage.recordPayment('Rizki Pratama', { method: 'TRANSFER' });

    await expect(paymentsPage.getToast()).toContainText(/payment recorded/i);
  });

  test('overdue payments display aging info', async ({ authenticatedPage: page, mockApi }) => {
    await setupPaymentMocks(mockApi);

    const paymentsPage = new StudentPaymentsPage(page);
    await paymentsPage.goto();

    // Wait for table to load
    await expect(paymentsPage.tableRows.first()).toBeVisible();

    // Fajar Hidayat has OVERDUE status with due_date in the past (2026-01-15)
    const overdueRow = paymentsPage.getRowByStudentName('Fajar Hidayat');
    await expect(overdueRow).toBeVisible();

    // Overdue row should show aging info (X days overdue)
    await expect(overdueRow.getByText(/days overdue/i)).toBeVisible();
  });

  test('payment methods are available in select', async ({ authenticatedPage: page, mockApi }) => {
    await setupPaymentMocks(mockApi);

    const paymentsPage = new StudentPaymentsPage(page);
    await paymentsPage.goto();

    // Wait for table to load
    await expect(paymentsPage.tableRows.first()).toBeVisible();

    // Open record payment modal for a pending payment
    const pendingRow = paymentsPage.getRowByStudentName('Rizki Pratama');
    await pendingRow.locator('button[title="Record Payment"]').click();
    await page.getByRole('heading', { name: /record payment/i }).waitFor({ state: 'visible' });

    // Verify payment method options are present
    // The modal has a select with TRANSFER/CASH options (no htmlFor label association)
    const methodSelect = page.locator('select').filter({ has: page.locator('option[value="TRANSFER"]') });
    await expect(methodSelect).toBeVisible();
    await expect(methodSelect.locator('option[value="TRANSFER"]')).toHaveCount(1);
    await expect(methodSelect.locator('option[value="CASH"]')).toHaveCount(1);
  });
});
