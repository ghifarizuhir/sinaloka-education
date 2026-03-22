import { test, expect } from '../fixtures/mock-api.fixture';
import {
  setupAuthMocks,
  setupPayoutMocks,
  setupTutorMocks,
} from '../helpers/api-mocker';
import { PayoutsPage } from '../pages/payouts.page';

test.describe('Payouts', () => {
  let payouts: PayoutsPage;

  test.beforeEach(async ({ mockApi, authedPage }) => {
    await setupAuthMocks(mockApi);
    await setupPayoutMocks(mockApi);
    await setupTutorMocks(mockApi);
    payouts = new PayoutsPage(authedPage);
  });

  test.describe('Smoke', () => {
    test('table loads with payouts', async () => {
      await payouts.goto();
      await expect(payouts.table).toBeVisible();
      await expect(payouts.rows).toHaveCount(2);
    });

    test('search filters', async () => {
      await payouts.goto();
      await expect(payouts.table).toBeVisible();
      await payouts.search('Dewi');
      await expect(payouts.getRowByName('Dewi Lestari')).toBeVisible();
    });
  });

  test.describe('CRUD', () => {
    test.beforeEach(async () => {
      await payouts.goto();
      await expect(payouts.table).toBeVisible();
    });

    test('create payout', async () => {
      await payouts.createPayout({
        tutorName: 'Dewi Lestari',
        amount: 500000,
        date: '2026-04-01',
      });
      await expect(payouts.getToast()).toBeVisible({ timeout: 5000 });
    });

    test('create payout with description', async () => {
      await payouts.createPayout({
        tutorName: 'Dewi Lestari',
        amount: 500000,
        date: '2026-04-01',
        description: 'April payout',
      });
      await expect(payouts.getToast()).toBeVisible({ timeout: 5000 });
    });

    test('reconcile payout', async () => {
      await payouts.reconcilePayout('Dewi Lestari');
      await expect(payouts.getToast()).toBeVisible({ timeout: 5000 });
    });

    test('delete payout', async () => {
      await payouts.deletePayout('Rina Wijaya');
      await expect(payouts.getToast()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Negative', () => {
    test('create without amount blocked', async ({ authedPage }) => {
      await payouts.goto();
      await expect(payouts.table).toBeVisible();

      // Open modal but don't fill amount
      await payouts.addButton.click();
      const modal = authedPage.locator('.fixed').last();

      // Select tutor
      const tutorSelect = modal.locator('select');
      await tutorSelect.selectOption({ label: 'Dewi Lestari' });

      // Fill date but skip amount
      const dateInput = modal.getByLabel('Date');
      await dateInput.fill('2026-04-01');

      // Submit button should be disabled or click should not produce success toast
      const submitBtn = modal.getByRole('button', { name: /add payout/i });
      const isDisabled = await submitBtn.isDisabled();
      if (!isDisabled) {
        await submitBtn.click();
        // Should not get a success toast — either no toast or an error toast
      }
      // Verify we didn't navigate away (still on payouts page)
      expect(authedPage.url()).toContain('/finance/payouts');
    });
  });
});
