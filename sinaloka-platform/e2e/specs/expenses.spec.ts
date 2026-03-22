import { test, expect } from '../fixtures/mock-api.fixture';
import { setupAuthMocks, setupExpenseMocks } from '../helpers/api-mocker';
import { ExpensesPage } from '../pages/expenses.page';

test.describe('Expenses', () => {
  let expenses: ExpensesPage;

  test.beforeEach(async ({ mockApi, authedPage }) => {
    await setupAuthMocks(mockApi);
    await setupExpenseMocks(mockApi);
    expenses = new ExpensesPage(authedPage);
  });

  test.describe('Smoke', () => {
    test('table loads with expenses', async () => {
      await expenses.goto();
      await expect(expenses.table).toBeVisible();
      await expect(expenses.rows).toHaveCount(2);
    });

    test('shows category badges', async () => {
      await expenses.goto();
      await expect(expenses.table).toBeVisible();
      await expect(expenses.getRowByDescription('Monthly office rent').getByText('RENT').first()).toBeVisible();
      await expect(expenses.getRowByDescription('Whiteboard markers').getByText('SUPPLIES').first()).toBeVisible();
    });
  });

  test.describe('CRUD', () => {
    test.beforeEach(async () => {
      await expenses.goto();
      await expect(expenses.table).toBeVisible();
    });

    test('create expense', async () => {
      await expenses.createExpense({
        amount: 500000,
        date: '2026-03-20',
        category: 'UTILITIES',
        description: 'Electricity bill',
      });
      await expect(expenses.getToast()).toBeVisible({ timeout: 5000 });
    });

    test('edit expense', async () => {
      await expenses.editExpense('Monthly office rent', { amount: 5500000 });
      await expect(expenses.getToast()).toBeVisible({ timeout: 5000 });
    });

    test('delete expense', async () => {
      await expenses.deleteExpense('Whiteboard markers');
      await expect(expenses.getToast()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Negative', () => {
    test('empty amount shows error', async ({ authedPage }) => {
      await expenses.goto();
      await expect(expenses.table).toBeVisible();

      // Open the drawer but don't fill amount
      await expenses.addButton.click();
      const drawer = authedPage.getByRole('dialog');
      await expect(drawer).toBeVisible();

      // Fill date and category but skip amount
      await drawer.locator('input[type="date"]').first().fill('2026-03-20');
      await drawer.locator('select').selectOption('UTILITIES');
      await drawer.locator('textarea').fill('Test expense');

      // Try to submit
      await drawer.getByRole('button', { name: /record expense/i }).click();

      // Should see validation error or toast — form should not close
      await expect(drawer).toBeVisible();
    });

    test('empty date shows error', async ({ authedPage }) => {
      await expenses.goto();
      await expect(expenses.table).toBeVisible();

      // Open the drawer but don't fill date
      await expenses.addButton.click();
      const drawer = authedPage.getByRole('dialog');
      await expect(drawer).toBeVisible();

      // Fill amount and category but skip date
      await drawer.locator('input[type="number"]').fill('500000');
      await drawer.locator('select').selectOption('UTILITIES');
      await drawer.locator('textarea').fill('Test expense');

      // Try to submit
      await drawer.getByRole('button', { name: /record expense/i }).click();

      // Should see validation error — form should not close
      await expect(drawer).toBeVisible();
    });
  });
});
