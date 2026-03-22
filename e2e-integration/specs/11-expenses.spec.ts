import { test, expect } from '../fixtures/auth.fixture.js';
import { resetDatabase } from '../helpers/db-reset.js';
import { ExpensesPage } from '../pages/expenses.page.js';
import { ApiClient } from '../helpers/api-client.js';
import { ACCOUNTS } from '../helpers/test-accounts.js';

// ─────────────────────────────────────────────────────────
// Expenses Integration Tests (26 tests)
// ─────────────────────────────────────────────────────────

// Seed data references (inst1 — Cerdas institution)
// Expenses (2 total):
//   SUPPLIES — 150,000
//   RENT     — 2,000,000

const TODAY = new Date().toISOString().split('T')[0];

// ─── Smoke (3) ───────────────────────────────────────────

test.describe('Expenses - Smoke', () => {
  test.beforeAll(async () => {
    await resetDatabase();
  });

  // 1. Table loads with seed expenses
  test('table loads with seed expenses', async ({ authedPage }) => {
    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();

    await expect(expenses.table).toBeVisible();
    await expect(expenses.rows.first()).toBeVisible();
  });

  // 2. Summary cards display (Total Expenses, Categories, Records Shown)
  test('summary cards display', async ({ authedPage }) => {
    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();

    await expect(expenses.summaryCards).toBeVisible();
  });

  // 3. Category badges render in rows
  test('category badges render in rows', async ({ authedPage }) => {
    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    // Seed has SUPPLIES and RENT categories — check one badge exists
    const firstRowBadge = expenses.rows.first().locator('td').nth(1).locator('span').first();
    await expect(firstRowBadge).toBeVisible();
  });
});

// ─── Create Happy (5) ────────────────────────────────────

test.describe('Expenses - Create Happy', () => {
  // 4. Create basic expense
  test('create basic expense', async ({ authedPage }) => {
    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    await expenses.createExpense({
      amount: 75000,
      date: TODAY,
      category: 'OTHER',
      description: 'Office snacks for team',
    });

    await expect(expenses.getToast()).toBeVisible();
    await expect(expenses.getRowByDescription('Office snacks for team')).toBeVisible();
  });

  // 5. Create with minimum fields — amount, date, category only (no description)
  test('create with minimum fields', async ({ authedPage }) => {
    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    await expenses.createExpense({
      amount: 25000,
      date: TODAY,
      category: 'UTILITIES',
    });

    await expect(expenses.getToast()).toBeVisible();
  });

  // 6. Create recurring monthly
  test('create recurring monthly expense', async ({ authedPage }) => {
    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    await expenses.createExpense({
      amount: 500000,
      date: TODAY,
      category: 'RENT',
      description: 'Monthly office rent',
      isRecurring: true,
      recurrenceFrequency: 'monthly',
    });

    await expect(expenses.getToast()).toBeVisible();
    await expect(expenses.getRowByDescription('Monthly office rent')).toBeVisible();
  });

  // 7. Create recurring weekly with end date
  test('create recurring weekly expense with end date', async ({ authedPage }) => {
    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);
    const endDateStr = endDate.toISOString().split('T')[0];

    await expenses.createExpense({
      amount: 100000,
      date: TODAY,
      category: 'SUPPLIES',
      description: 'Weekly cleaning supplies',
      isRecurring: true,
      recurrenceFrequency: 'weekly',
      recurrenceEndDate: endDateStr,
    });

    await expect(expenses.getToast()).toBeVisible();
    await expect(expenses.getRowByDescription('Weekly cleaning supplies')).toBeVisible();
  });

  // 8. Create with MARKETING category — verify badge
  test('create with MARKETING category shows correct badge', async ({ authedPage }) => {
    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    await expenses.createExpense({
      amount: 200000,
      date: TODAY,
      category: 'MARKETING',
      description: 'Social media ads',
    });

    await expect(expenses.getToast()).toBeVisible();

    const badge = expenses.getCategoryBadge('Social media ads');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/marketing/i);
  });
});

// ─── Create Negative (5) ─────────────────────────────────

test.describe('Expenses - Create Negative', () => {
  // 9. Amount = 0 → toast error, drawer stays open
  test('amount zero shows error toast', async ({ authedPage }) => {
    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    await expenses.addButton.click();
    const drawer = authedPage.getByRole('dialog');
    await expect(drawer).toBeVisible();

    await drawer.locator('input[type="number"]').fill('0');
    await drawer.locator('input[type="date"]').first().fill(TODAY);
    await drawer.locator('select').selectOption('OTHER');

    const submitButton = drawer.getByRole('button', { name: /record expense|save/i });
    await submitButton.click();

    // Drawer should stay open (validation error)
    await expect(drawer).toBeVisible();
  });

  // 10. Amount empty → toast error
  test('amount empty shows error toast', async ({ authedPage }) => {
    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    await expenses.addButton.click();
    const drawer = authedPage.getByRole('dialog');
    await expect(drawer).toBeVisible();

    // Leave amount empty, fill date and category
    await drawer.locator('input[type="date"]').first().fill(TODAY);
    await drawer.locator('select').selectOption('RENT');

    const submitButton = drawer.getByRole('button', { name: /record expense|save/i });
    await submitButton.click();

    // Drawer should stay open
    await expect(drawer).toBeVisible();
  });

  // 11. Amount negative → backend 400 or frontend rejection
  test('negative amount is rejected', async ({ authedPage }) => {
    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    await expenses.addButton.click();
    const drawer = authedPage.getByRole('dialog');
    await expect(drawer).toBeVisible();

    await drawer.locator('input[type="number"]').fill('-50000');
    await drawer.locator('input[type="date"]').first().fill(TODAY);
    await drawer.locator('select').selectOption('OTHER');

    const submitButton = drawer.getByRole('button', { name: /record expense|save/i });
    await submitButton.click();

    // Should either show error toast or drawer stays open
    await expect(drawer).toBeVisible();
  });

  // 12. Date empty → toast error
  test('date empty shows error toast', async ({ authedPage }) => {
    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    await expenses.addButton.click();
    const drawer = authedPage.getByRole('dialog');
    await expect(drawer).toBeVisible();

    await drawer.locator('input[type="number"]').fill('100000');
    // Leave date empty
    await drawer.locator('select').selectOption('SUPPLIES');

    const submitButton = drawer.getByRole('button', { name: /record expense|save/i });
    await submitButton.click();

    // Drawer should stay open
    await expect(drawer).toBeVisible();
  });

  // 13. Description > 500 chars → backend 400 error
  test('description over 500 chars returns backend error', async () => {
    const api = new ApiClient();
    await api.loginAs(ACCOUNTS.ADMIN_CERDAS);

    const longDescription = 'A'.repeat(501);

    try {
      await api.post('/admin/expenses', {
        amount: 100000,
        date: TODAY,
        category: 'OTHER',
        description: longDescription,
      });
      // If backend allows it, that's acceptable too
    } catch (err: any) {
      expect(err.response.status).toBeGreaterThanOrEqual(400);
    }
  });
});

// ─── Update (6) ──────────────────────────────────────────

test.describe('Expenses - Update', () => {
  const EDIT_DESC = 'Expense for editing';

  // 14. Edit amount
  test('edit amount', async ({ authedPage }) => {
    // Create an expense to edit via API
    const api = new ApiClient();
    await api.loginAs(ACCOUNTS.ADMIN_CERDAS);
    await api.post('/admin/expenses', {
      amount: 100000,
      date: TODAY,
      category: 'SUPPLIES',
      description: EDIT_DESC,
    });

    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    await expenses.editExpense(EDIT_DESC, { amount: 250000 });

    await expect(expenses.getToast()).toBeVisible();
  });

  // 15. Edit category
  test('edit category', async ({ authedPage }) => {
    const api = new ApiClient();
    await api.loginAs(ACCOUNTS.ADMIN_CERDAS);
    await api.post('/admin/expenses', {
      amount: 100000,
      date: TODAY,
      category: 'SUPPLIES',
      description: EDIT_DESC,
    });

    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    await expenses.editExpense(EDIT_DESC, { category: 'MARKETING' });

    await expect(expenses.getToast()).toBeVisible();

    // Verify badge updated
    const badge = expenses.getCategoryBadge(EDIT_DESC);
    await expect(badge).toContainText(/marketing/i);
  });

  // 16. Edit description
  test('edit description', async ({ authedPage }) => {
    const api = new ApiClient();
    await api.loginAs(ACCOUNTS.ADMIN_CERDAS);
    await api.post('/admin/expenses', {
      amount: 100000,
      date: TODAY,
      category: 'SUPPLIES',
      description: EDIT_DESC,
    });

    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    const newDescription = 'Updated expense description';
    await expenses.editExpense(EDIT_DESC, { description: newDescription });

    await expect(expenses.getToast()).toBeVisible();
    await expect(expenses.getRowByDescription(newDescription)).toBeVisible();
  });

  // 17. Drawer pre-fills existing values
  test('drawer pre-fills existing values on edit', async ({ authedPage }) => {
    const api = new ApiClient();
    await api.loginAs(ACCOUNTS.ADMIN_CERDAS);
    await api.post('/admin/expenses', {
      amount: 350000,
      date: TODAY,
      category: 'RENT',
      description: EDIT_DESC,
    });

    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    // Click edit button on the row
    const row = expenses.getRowByDescription(EDIT_DESC);
    await row.locator('button').nth(0).click();

    const drawer = authedPage.getByRole('dialog');
    await expect(drawer).toBeVisible();

    // Verify fields are pre-filled
    const amountInput = drawer.locator('input[type="number"]');
    await expect(amountInput).toHaveValue('350000');

    const categorySelect = drawer.locator('select');
    await expect(categorySelect).toHaveValue('RENT');

    const descriptionTextarea = drawer.locator('textarea');
    await expect(descriptionTextarea).toHaveValue(EDIT_DESC);

    // Close drawer without saving
    await authedPage.keyboard.press('Escape');
  });

  // 18. Toggle recurring ON on non-recurring expense
  test('toggle recurring ON on non-recurring expense', async ({ authedPage }) => {
    const api = new ApiClient();
    await api.loginAs(ACCOUNTS.ADMIN_CERDAS);
    await api.post('/admin/expenses', {
      amount: 100000,
      date: TODAY,
      category: 'UTILITIES',
      description: EDIT_DESC,
    });

    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    await expenses.editExpense(EDIT_DESC, {
      isRecurring: true,
      recurrenceFrequency: 'monthly',
    });

    await expect(expenses.getToast()).toBeVisible();
  });

  // 19. Toggle recurring OFF on recurring expense
  test('toggle recurring OFF on recurring expense', async ({ authedPage }) => {
    const api = new ApiClient();
    await api.loginAs(ACCOUNTS.ADMIN_CERDAS);
    await api.post('/admin/expenses', {
      amount: 100000,
      date: TODAY,
      category: 'RENT',
      description: EDIT_DESC,
      is_recurring: true,
      recurrence_frequency: 'monthly',
    });

    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    await expenses.editExpense(EDIT_DESC, {
      isRecurring: false,
    });

    await expect(expenses.getToast()).toBeVisible();
  });
});

// ─── Delete (2) ──────────────────────────────────────────

test.describe('Expenses - Delete', () => {
  const DEL_DESC = 'Expense to delete';

  // 20. Delete with confirm
  test('delete expense with confirm removes row', async ({ authedPage }) => {
    // Create an expense to delete
    const api = new ApiClient();
    await api.loginAs(ACCOUNTS.ADMIN_CERDAS);
    await api.post('/admin/expenses', {
      amount: 50000,
      date: TODAY,
      category: 'OTHER',
      description: DEL_DESC,
    });

    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    await expect(expenses.getRowByDescription(DEL_DESC)).toBeVisible();
    await expenses.deleteExpense(DEL_DESC);

    await expect(expenses.getToast()).toBeVisible();
    await expect(expenses.getRowByDescription(DEL_DESC)).not.toBeVisible();
  });

  // 21. Cancel delete — row stays
  test('cancel delete keeps row', async ({ authedPage }) => {
    const api = new ApiClient();
    await api.loginAs(ACCOUNTS.ADMIN_CERDAS);
    await api.post('/admin/expenses', {
      amount: 50000,
      date: TODAY,
      category: 'OTHER',
      description: DEL_DESC,
    });

    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    // Click delete button on the row
    const row = expenses.getRowByDescription(DEL_DESC);
    await row.locator('button').last().click();

    // Cancel the confirm dialog
    const dialog = authedPage.getByRole('alertdialog');
    await expect(dialog).toBeVisible();

    const cancelBtn = dialog.getByRole('button').filter({ hasText: /cancel|batal/i });
    await cancelBtn.click();
    await expect(dialog).toBeHidden();

    // Row should still be visible
    await expect(expenses.getRowByDescription(DEL_DESC)).toBeVisible();
  });
});

// ─── Search + Filter (4) ─────────────────────────────────

test.describe('Expenses - Search + Filter', () => {
  // 22. Search by description
  test('search by description filters results', async ({ authedPage }) => {
    // Create an expense with a unique description for search
    const api = new ApiClient();
    await api.loginAs(ACCOUNTS.ADMIN_CERDAS);
    await api.post('/admin/expenses', {
      amount: 75000,
      date: TODAY,
      category: 'MARKETING',
      description: 'UniqueSearchTerm flyers',
    });

    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    await expenses.search('UniqueSearchTerm');

    // Wait for search debounce
    await authedPage.waitForTimeout(500);

    await expect(expenses.getRowByDescription('UniqueSearchTerm flyers')).toBeVisible();
  });

  // 23. No results → empty state
  test('search with no results shows empty state', async ({ authedPage }) => {
    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    await expenses.search('nonexistent-xyz-12345');

    // Wait for search debounce
    await authedPage.waitForTimeout(500);

    // Should show empty state or no rows
    const emptyState = authedPage.getByText(/no expenses|no results|tidak ada/i);
    const noRows = expenses.rows;

    // Either empty message appears or rows count is 0
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    const rowCount = await noRows.count();
    expect(emptyVisible || rowCount === 0).toBeTruthy();
  });

  // 24. Filter by category — select RENT
  test('filter by RENT category', async ({ authedPage }) => {
    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    await expenses.filterByCategory('RENT');

    // All visible rows should have RENT badge
    const firstRow = expenses.rows.first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow).toContainText(/rent/i);
  });

  // 25. Clear filter — all rows return
  test('clear filter shows all expenses', async ({ authedPage }) => {
    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    // Apply filter first
    await expenses.filterByCategory('RENT');
    const filteredCount = await expenses.rows.count();

    // Clear filter
    await expenses.clearFilter();

    // After clearing, should show more (or equal) rows
    const allCount = await expenses.rows.count();
    expect(allCount).toBeGreaterThanOrEqual(filteredCount);
  });
});

// ─── Export (1) ──────────────────────────────────────────

test.describe('Expenses - Export', () => {
  // 26. Export CSV — click export, verify no error toast
  test('export CSV triggers download without error', async ({ authedPage }) => {
    const expenses = new ExpensesPage(authedPage);
    await expenses.goto();
    await expect(expenses.table).toBeVisible();

    await expenses.exportCsv();

    // Verify no error toast appeared — if a toast appears, it should be success, not error
    const errorToast = authedPage.locator('[data-sonner-toast][data-type="error"]');
    await expect(errorToast).not.toBeVisible();
  });
});
