import { test, expect } from '../fixtures/mock-api.fixture';
import { setupAuthMocks, setupPaymentMocks } from '../helpers/api-mocker';
import { PaymentsPage } from '../pages/payments.page';

test.describe('Payments', () => {
  let payments: PaymentsPage;

  test.beforeEach(async ({ mockApi, authedPage }) => {
    await setupAuthMocks(mockApi);
    await setupPaymentMocks(mockApi);
    payments = new PaymentsPage(authedPage);
  });

  test.describe('Smoke', () => {
    test('table loads with payments', async () => {
      await payments.goto();
      await expect(payments.table).toBeVisible();
      await expect(payments.rows).toHaveCount(3);
    });

    test('status badges shown', async () => {
      await payments.goto();
      await expect(payments.getRowByName('Rizki Pratama').getByText('Paid').first()).toBeVisible();
      await expect(payments.getRowByName('Aisyah Putri').getByText('Pending').first()).toBeVisible();
      await expect(payments.getRowByName('Fajar Hidayat').getByText('Overdue').first()).toBeVisible();
    });

    test('status filter works', async () => {
      await payments.goto();
      await payments.filterByStatus('PENDING');
      // Filter should be applied — the select value should change
      await expect(payments.statusFilter).toHaveValue('PENDING');
    });
  });

  test.describe('CRUD', () => {
    test.beforeEach(async () => {
      await payments.goto();
      await expect(payments.table).toBeVisible();
    });

    test('record cash payment', async () => {
      await payments.recordPayment('Aisyah Putri', { method: 'CASH' });
      await expect(payments.getToast()).toBeVisible({ timeout: 5000 });
    });

    test('record transfer payment', async () => {
      await payments.recordPayment('Fajar Hidayat', { method: 'TRANSFER' });
      await expect(payments.getToast()).toBeVisible({ timeout: 5000 });
    });

    test('record payment with discount', async () => {
      await payments.recordPayment('Aisyah Putri', { discount: 10000 });
      await expect(payments.getToast()).toBeVisible({ timeout: 5000 });
    });

    test('delete payment', async () => {
      await payments.deletePayment('Rizki Pratama');
      await expect(payments.getToast()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Negative', () => {
    test('server error shows toast', async ({ mockApi, authedPage }) => {
      await payments.goto();
      await expect(payments.table).toBeVisible();

      // Override PATCH to return 500
      await mockApi.onPatch('**/api/admin/payments/*').respondWith(500, { message: 'Internal Server Error' });

      await payments.recordPayment('Aisyah Putri', { method: 'CASH' });
      await expect(payments.getToast()).toBeVisible({ timeout: 5000 });
    });
  });
});
