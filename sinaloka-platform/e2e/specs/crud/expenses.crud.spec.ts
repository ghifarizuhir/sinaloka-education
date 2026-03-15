import { test, expect } from '../../fixtures/auth.fixture';
import { setupExpenseMocks } from '../../helpers/api-mocker';
import { OperatingExpensesPage } from '../../pages/operating-expenses.page';
import expensesData from '../../mocks/expenses.json';

test.describe('Operating Expenses CRUD', () => {
  test.beforeEach(async ({ authenticatedPage: page, mockApi }) => {
    await setupExpenseMocks(mockApi);
  });

  // ── Create ──────────────────────────────────────────────────────────────

  test('create expense with all fields shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const expensesPage = new OperatingExpensesPage(page);
    await expensesPage.goto();

    await expensesPage.createExpense({
      amount: 3000000,
      date: '2026-03-15',
      category: 'UTILITIES',
      description: 'Electricity bill March 2026',
    });

    await expect(expensesPage.getToast()).toContainText(/expense (recorded|created)/i);
  });

  test('create RENT expense shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const expensesPage = new OperatingExpensesPage(page);
    await expensesPage.goto();

    await expensesPage.createExpense({
      amount: 5000000,
      date: '2026-03-01',
      category: 'RENT',
      description: 'Office rent March 2026',
    });

    await expect(expensesPage.getToast()).toContainText(/expense (recorded|created)/i);
  });

  test('create SUPPLIES expense shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const expensesPage = new OperatingExpensesPage(page);
    await expensesPage.goto();

    await expensesPage.createExpense({
      amount: 500000,
      date: '2026-03-10',
      category: 'SUPPLIES',
      description: 'Stationery for March',
    });

    await expect(expensesPage.getToast()).toContainText(/expense (recorded|created)/i);
  });

  test('create MARKETING expense shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const expensesPage = new OperatingExpensesPage(page);
    await expensesPage.goto();

    await expensesPage.createExpense({
      amount: 1000000,
      date: '2026-03-05',
      category: 'MARKETING',
      description: 'Social media ads',
    });

    await expect(expensesPage.getToast()).toContainText(/expense (recorded|created)/i);
  });

  test('create OTHER expense shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const expensesPage = new OperatingExpensesPage(page);
    await expensesPage.goto();

    await expensesPage.createExpense({
      amount: 200000,
      date: '2026-03-12',
      category: 'OTHER',
      description: 'Miscellaneous expense',
    });

    await expect(expensesPage.getToast()).toContainText(/expense (recorded|created)/i);
  });

  test('create expense without description shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const expensesPage = new OperatingExpensesPage(page);
    await expensesPage.goto();

    await expensesPage.createExpense({
      amount: 750000,
      date: '2026-03-15',
      category: 'UTILITIES',
    });

    await expect(expensesPage.getToast()).toContainText(/expense (recorded|created)/i);
  });

  // ── Read / List ──────────────────────────────────────────────────────────

  test('expense table loads with data from API', async ({ authenticatedPage: page, mockApi }) => {
    const expensesPage = new OperatingExpensesPage(page);
    await expensesPage.goto();

    await expect(expensesPage.table).toBeVisible();
    await expect(expensesPage.tableRows.first()).toBeVisible();

    await expect(expensesPage.getRowByDescription('Office rent March 2026')).toBeVisible();
    await expect(expensesPage.getRowByDescription('Whiteboard markers and papers')).toBeVisible();
  });

  test('expense list shows correct count', async ({ authenticatedPage: page, mockApi }) => {
    const expensesPage = new OperatingExpensesPage(page);
    await expensesPage.goto();

    await expect(expensesPage.tableRows).toHaveCount(expensesData.data.length);
  });

  test('expense rows display category and amount', async ({ authenticatedPage: page, mockApi }) => {
    const expensesPage = new OperatingExpensesPage(page);
    await expensesPage.goto();

    const rentRow = expensesPage.getRowByDescription('Office rent March 2026');
    await expect(rentRow).toBeVisible();
    await expect(rentRow.getByText(/rent/i)).toBeVisible();
    await expect(rentRow.getByText(/5[,.]?000[,.]?000|5000000/)).toBeVisible();
  });

  // ── Category Filter ───────────────────────────────────────────────────────

  test('category filter shows only RENT expenses', async ({ authenticatedPage: page, mockApi }) => {
    const expensesPage = new OperatingExpensesPage(page);
    await expensesPage.goto();

    await expect(expensesPage.tableRows.first()).toBeVisible();

    await expensesPage.filterByCategory('Rent');

    await expect(expensesPage.getRowByDescription('Office rent March 2026')).toBeVisible();
    await expect(expensesPage.tableRows).toHaveCount(1);
  });

  test('category filter shows only SUPPLIES expenses', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const expensesPage = new OperatingExpensesPage(page);
    await expensesPage.goto();

    await expect(expensesPage.tableRows.first()).toBeVisible();

    await expensesPage.filterByCategory('Supplies');

    await expect(expensesPage.getRowByDescription('Whiteboard markers and papers')).toBeVisible();
    await expect(expensesPage.tableRows).toHaveCount(1);
  });

  // ── Edit ─────────────────────────────────────────────────────────────────

  test('edit expense amount shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const expensesPage = new OperatingExpensesPage(page);
    await expensesPage.goto();

    await expect(expensesPage.tableRows.first()).toBeVisible();

    await expensesPage.editExpense('Office rent March 2026', { amount: 5500000 });

    await expect(expensesPage.getToast()).toContainText(/expense updated/i);
  });

  test('edit expense category shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const expensesPage = new OperatingExpensesPage(page);
    await expensesPage.goto();

    await expect(expensesPage.tableRows.first()).toBeVisible();

    await expensesPage.editExpense('Whiteboard markers and papers', { category: 'OTHER' });

    await expect(expensesPage.getToast()).toContainText(/expense updated/i);
  });

  test('edit expense date shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const expensesPage = new OperatingExpensesPage(page);
    await expensesPage.goto();

    await expect(expensesPage.tableRows.first()).toBeVisible();

    await expensesPage.editExpense('Office rent March 2026', { date: '2026-03-02' });

    await expect(expensesPage.getToast()).toContainText(/expense updated/i);
  });

  // ── Delete ───────────────────────────────────────────────────────────────

  test('delete expense with confirmation shows success toast', async ({
    authenticatedPage: page,
    mockApi,
  }) => {
    const expensesPage = new OperatingExpensesPage(page);
    await expensesPage.goto();

    await expect(expensesPage.tableRows.first()).toBeVisible();

    await expensesPage.deleteExpense('Office rent March 2026');

    await expect(expensesPage.getToast()).toBeVisible();
  });

  test('delete second expense shows success toast', async ({ authenticatedPage: page, mockApi }) => {
    const expensesPage = new OperatingExpensesPage(page);
    await expensesPage.goto();

    await expect(expensesPage.tableRows.first()).toBeVisible();

    await expensesPage.deleteExpense('Whiteboard markers and papers');

    await expect(expensesPage.getToast()).toBeVisible();
  });
});
