import { test, expect } from '../../fixtures/auth.fixture';
import { setupPaymentMocks } from '../../helpers/api-mocker';
import { StudentPaymentsPage } from '../../pages/student-payments.page';

test.describe('Student Payments CRUD', () => {
  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupPaymentMocks(mockApi);
  });

  // ── Record Payment – Methods ─────────────────────────────────────────────

  test('record payment with CASH method shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const paymentsPage = new StudentPaymentsPage(page);
    await paymentsPage.goto();

    await expect(paymentsPage.tableRows.first()).toBeVisible();

    await paymentsPage.recordPayment('Rizki Pratama', { method: 'CASH' });

    await expect(paymentsPage.getToast()).toContainText(/payment recorded/i);
  });

  test('record payment with TRANSFER method shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const paymentsPage = new StudentPaymentsPage(page);
    await paymentsPage.goto();

    await expect(paymentsPage.tableRows.first()).toBeVisible();

    await paymentsPage.recordPayment('Rizki Pratama', { method: 'TRANSFER' });

    await expect(paymentsPage.getToast()).toContainText(/payment recorded/i);
  });

  test('record payment with E-Wallet method shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const paymentsPage = new StudentPaymentsPage(page);
    await paymentsPage.goto();

    await expect(paymentsPage.tableRows.first()).toBeVisible();

    await paymentsPage.recordPayment('Rizki Pratama', { method: 'E_WALLET' });

    await expect(paymentsPage.getToast()).toContainText(/payment recorded/i);
  });

  // ── Payment Modal – Fields ────────────────────────────────────────────────

  test('payment method options include CASH, TRANSFER, E-Wallet', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const paymentsPage = new StudentPaymentsPage(page);
    await paymentsPage.goto();

    await expect(paymentsPage.tableRows.first()).toBeVisible();

    const pendingRow = paymentsPage.getRowByStudentName('Rizki Pratama');
    await pendingRow.locator('button[title="Record Payment"]').click();
    await page.getByRole('heading', { name: /record payment/i }).waitFor({ state: 'visible' });

    const methodSelect = page.getByLabel(/method/i);
    await expect(methodSelect).toBeVisible();
    await expect(methodSelect.locator('option[value="CASH"]')).toHaveCount(1);
    await expect(methodSelect.locator('option[value="TRANSFER"]')).toHaveCount(1);
  });

  test('discount application changes amount before confirming', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const paymentsPage = new StudentPaymentsPage(page);
    await paymentsPage.goto();

    await expect(paymentsPage.tableRows.first()).toBeVisible();

    await paymentsPage.recordPayment('Rizki Pratama', {
      amount: 450000,
      discount: 50000,
      method: 'CASH',
    });

    await expect(paymentsPage.getToast()).toContainText(/payment recorded/i);
  });

  test('custom payment amount is accepted', async ({ authenticatedPage: page, mockApi }) => {
    const paymentsPage = new StudentPaymentsPage(page);
    await paymentsPage.goto();

    await expect(paymentsPage.tableRows.first()).toBeVisible();

    await paymentsPage.recordPayment('Rizki Pratama', { amount: 300000, method: 'TRANSFER' });

    await expect(paymentsPage.getToast()).toContainText(/payment recorded/i);
  });

  // ── Aging / Status Display ────────────────────────────────────────────────

  test('overdue payment row displays days overdue information', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const paymentsPage = new StudentPaymentsPage(page);
    await paymentsPage.goto();

    await expect(paymentsPage.tableRows.first()).toBeVisible();

    // Fajar Hidayat has OVERDUE status with due_date 2026-01-15 (in the past)
    const overdueRow = paymentsPage.getRowByStudentName('Fajar Hidayat');
    await expect(overdueRow).toBeVisible();
    await expect(overdueRow.getByText(/days overdue/i)).toBeVisible();
  });

  test('pending payment row shows pending status badge', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const paymentsPage = new StudentPaymentsPage(page);
    await paymentsPage.goto();

    await expect(paymentsPage.tableRows.first()).toBeVisible();

    const pendingRow = paymentsPage.getRowByStudentName('Rizki Pratama');
    await expect(pendingRow).toBeVisible();
    await expect(pendingRow.getByText(/pending/i)).toBeVisible();
  });

  test('paid payment row shows paid status badge', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const paymentsPage = new StudentPaymentsPage(page);
    await paymentsPage.goto();

    await expect(paymentsPage.tableRows.first()).toBeVisible();

    const paidRow = paymentsPage.getRowByStudentName('Aisyah Putri');
    await expect(paidRow).toBeVisible();
    await expect(paidRow.getByText(/paid/i)).toBeVisible();
  });

  // ── Status Filter ─────────────────────────────────────────────────────────

  test('filter by PENDING status shows only pending payments', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const paymentsPage = new StudentPaymentsPage(page);
    await paymentsPage.goto();

    await expect(paymentsPage.tableRows.first()).toBeVisible();

    await paymentsPage.filterByStatus('PENDING');

    await expect(paymentsPage.getRowByStudentName('Rizki Pratama')).toBeVisible();
    await expect(paymentsPage.tableRows).toHaveCount(1);
  });

  test('filter by OVERDUE status shows only overdue payments', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const paymentsPage = new StudentPaymentsPage(page);
    await paymentsPage.goto();

    await expect(paymentsPage.tableRows.first()).toBeVisible();

    await paymentsPage.filterByStatus('OVERDUE');

    await expect(paymentsPage.getRowByStudentName('Fajar Hidayat')).toBeVisible();
    await expect(paymentsPage.tableRows).toHaveCount(1);
  });

  test('filter by PAID status shows only paid payments', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const paymentsPage = new StudentPaymentsPage(page);
    await paymentsPage.goto();

    await expect(paymentsPage.tableRows.first()).toBeVisible();

    await paymentsPage.filterByStatus('PAID');

    await expect(paymentsPage.getRowByStudentName('Aisyah Putri')).toBeVisible();
    await expect(paymentsPage.tableRows).toHaveCount(1);
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  test('delete payment with confirmation shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const paymentsPage = new StudentPaymentsPage(page);
    await paymentsPage.goto();

    await expect(paymentsPage.tableRows.first()).toBeVisible();

    await paymentsPage.deletePayment('Aisyah Putri');

    await expect(paymentsPage.getToast()).toBeVisible();
  });
});
