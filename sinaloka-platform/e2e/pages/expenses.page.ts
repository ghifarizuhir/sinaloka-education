import { type Page, type Locator } from '@playwright/test';
import { confirmDialog } from '../helpers/confirm-dialog';

export class ExpensesPage {
  /* -- Top-level actions -- */
  readonly addButton: Locator;
  readonly searchInput: Locator;

  /* -- Table -- */
  readonly table: Locator;
  readonly rows: Locator;

  /* -- Toast -- */
  readonly toast: Locator;

  constructor(private page: Page) {
    this.addButton = page.getByRole('button', { name: /record expense/i });
    this.searchInput = page.getByPlaceholder(/search expenses/i);
    this.table = page.locator('table');
    this.rows = page.locator('table tbody tr');
    this.toast = page.locator('[data-sonner-toaster]');
  }

  async goto() {
    await this.page.goto('/finance/expenses');
  }

  /* -- Drawer helpers -- */

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
  }

  async createExpense(data: {
    amount: number;
    date: string;
    category: string;
    description?: string;
  }) {
    await this.addButton.click();
    await this.fillForm(data);
    // Submit button text: "Record Expense" (expenses.drawer.saveExpense)
    await this.drawer
      .getByRole('button', { name: /record expense/i })
      .click();
  }

  async editExpense(
    description: string,
    data: {
      amount?: number;
      date?: string;
      category?: string;
      description?: string;
    },
  ) {
    const row = this.getRowByDescription(description);
    // Edit button is the second-to-last button in the actions column (FileText icon)
    // Buttons order: [optional receipt link], edit (FileText), delete (Trash2)
    const buttons = row.locator('button');
    // Edit is the first <button>, delete is the second (receipt link is <a> not <button>)
    await buttons.nth(0).click();

    await this.fillForm(data);
    // Submit button text: "Save Changes" (expenses.drawer.updateExpense)
    await this.drawer
      .getByRole('button', { name: /save changes/i })
      .click();
  }

  /**
   * Delete an expense by finding its row via description text.
   * Uses ConfirmDialog (role="alertdialog").
   */
  async deleteExpense(description: string) {
    const row = this.getRowByDescription(description);
    // Delete button is the last <button> in the row (Trash2 icon)
    await row.locator('button').last().click();

    await confirmDialog(this.page);
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  getRowByDescription(description: string): Locator {
    return this.rows.filter({ hasText: description });
  }

  getToast(): Locator {
    return this.toast;
  }
}
