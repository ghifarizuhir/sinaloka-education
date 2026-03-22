import { type Page, type Locator } from '@playwright/test';
import { confirmDialog } from '../helpers/confirm-dialog.js';

export class ExpensesPage {
  /* ── Top-level actions ── */
  readonly addButton: Locator;
  readonly searchInput: Locator;

  /* ── Summary cards ── */
  readonly summaryCards: Locator;

  /* ── Filters ── */
  readonly categoryFilter: Locator;

  /* ── Export ── */
  readonly exportCsvButton: Locator;

  /* ── Table ── */
  readonly table: Locator;
  readonly rows: Locator;

  /* ── Toast ── */
  readonly toast: Locator;

  constructor(private page: Page) {
    // "Record Expense" button text from t('expenses.recordExpense')
    this.addButton = page.getByRole('button', { name: /record expense/i });
    this.searchInput = page.getByPlaceholder(/search expenses/i);

    // Summary cards: grid of 3 cards (Total Expenses, Categories, Records Shown)
    this.summaryCards = page.locator('.grid.grid-cols-1.md\\:grid-cols-3');

    // Category filter — native <select> inside the table header bar
    // There's a search input and a Select component for category filtering
    this.categoryFilter = page.locator('.p-4.border-b select').first();

    // Export button — text from t('common.export')
    this.exportCsvButton = page.getByRole('button', { name: /export/i });

    this.table = page.locator('table');
    this.rows = page.locator('table tbody tr');
    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/finance/expenses');
  }

  /* ── Drawer helpers ── */

  private get drawer(): Locator {
    return this.page.getByRole('dialog');
  }

  /**
   * Fill the expense drawer form fields present in `data`.
   * Assumes the drawer is already open.
   */
  private async fillForm(data: {
    amount?: number;
    date?: string;
    category?: string;
    description?: string;
    isRecurring?: boolean;
    recurrenceFrequency?: 'weekly' | 'monthly';
    recurrenceEndDate?: string;
  }) {
    const drawer = this.drawer;

    if (data.amount !== undefined) {
      await drawer.locator('input[type="number"]').fill(String(data.amount));
    }

    if (data.date !== undefined) {
      await drawer.locator('input[type="date"]').first().fill(data.date);
    }

    if (data.category !== undefined) {
      await drawer.locator('select').selectOption(data.category);
    }

    if (data.description !== undefined) {
      await drawer.locator('textarea').fill(data.description);
    }

    if (data.isRecurring !== undefined) {
      // The recurring toggle is a Switch component — rendered as a button with role switch
      // Check current state and toggle if needed
      const switchEl = drawer.locator('button[role="switch"]');
      const isCurrentlyChecked = await switchEl.getAttribute('aria-checked') === 'true';
      if (data.isRecurring !== isCurrentlyChecked) {
        await switchEl.click();
      }
    }

    if (data.recurrenceFrequency) {
      // Frequency buttons: "Weekly" or "Monthly" — plain buttons inside the recurring section
      const freqLabel = data.recurrenceFrequency === 'weekly' ? /weekly/i : /monthly/i;
      await drawer.getByRole('button', { name: freqLabel }).click();
    }

    if (data.recurrenceEndDate) {
      // Recurrence end date — second date input (after the main date)
      await drawer.locator('input[type="date"]').nth(1).fill(data.recurrenceEndDate);
    }
  }

  async createExpense(data: {
    amount: number;
    date: string;
    category: string;
    description?: string;
    isRecurring?: boolean;
    recurrenceFrequency?: 'weekly' | 'monthly';
    recurrenceEndDate?: string;
  }) {
    await this.addButton.click();
    await this.fillForm(data);
    // Submit button text: t('expenses.drawer.saveExpense') — "Record Expense"
    const submitButton = this.drawer.getByRole('button', { name: /record expense|save/i });
    await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.url().includes('/api/admin/expenses') && resp.request().method() === 'POST',
      ),
      submitButton.click(),
    ]);
  }

  async editExpense(
    description: string,
    data: {
      amount?: number;
      date?: string;
      category?: string;
      description?: string;
      isRecurring?: boolean;
      recurrenceFrequency?: 'weekly' | 'monthly';
      recurrenceEndDate?: string;
    },
  ) {
    const row = this.getRowByDescription(description);
    // Edit button has FileText icon — first <button> in the row actions
    const buttons = row.locator('button');
    await buttons.nth(0).click();

    await this.fillForm(data);
    // Submit button text: t('expenses.drawer.updateExpense') — "Save Changes" / "Update"
    const submitButton = this.drawer.getByRole('button', { name: /save changes|update/i });
    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/expenses') && resp.request().method() === 'PATCH',
      ),
      submitButton.click(),
    ]);
  }

  /**
   * Delete an expense by finding its row via description text.
   * Uses ConfirmDialog (role="alertdialog").
   */
  async deleteExpense(description: string) {
    const row = this.getRowByDescription(description);
    // Delete button is the last <button> in the row (Trash2 icon)
    await row.locator('button').last().click();

    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/expenses') && resp.request().method() === 'DELETE',
      ),
      confirmDialog(this.page),
    ]);
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  /* ── Filter by category ── */

  async filterByCategory(category: string) {
    await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.url().includes('/api/admin/expenses') && resp.request().method() === 'GET',
      ),
      this.categoryFilter.selectOption(category),
    ]);
  }

  async clearFilter() {
    await this.filterByCategory('all');
  }

  /* ── Export CSV ── */

  async exportCsv() {
    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/expenses') &&
          resp.url().includes('export'),
      ),
      this.exportCsvButton.click(),
    ]);
  }

  /* ── Row helpers ── */

  getRowByDescription(description: string): Locator {
    return this.rows.filter({ hasText: description });
  }

  /**
   * Get category badge locator for a row identified by description.
   * The category badge is rendered as a Badge component in the second column.
   */
  getCategoryBadge(description: string): Locator {
    const row = this.getRowByDescription(description);
    return row.locator('td').nth(1).locator('span').first();
  }

  getToast(): Locator {
    return this.toast;
  }
}
