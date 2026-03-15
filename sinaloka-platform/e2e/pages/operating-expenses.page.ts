import { type Locator, type Page } from '@playwright/test';

export interface ExpenseFormData {
  amount: number;
  date: string;
  category: 'RENT' | 'UTILITIES' | 'SUPPLIES' | 'MARKETING' | 'OTHER';
  description?: string;
}

export class OperatingExpensesPage {
  readonly recordExpenseButton: Locator;
  readonly exportButton: Locator;
  readonly table: Locator;
  readonly tableRows: Locator;
  // The expense form is a Drawer (role="dialog" after Task 0)
  readonly drawer: Locator;
  readonly categoryFilter: Locator;
  readonly searchInput: Locator;

  constructor(private page: Page) {
    this.recordExpenseButton = page.getByRole('button', { name: /record expense/i });
    this.exportButton = page.getByRole('button', { name: /export/i });
    this.table = page.locator('table');
    this.tableRows = page.locator('table tbody tr');
    this.drawer = page.locator('[role="dialog"]');
    this.categoryFilter = page.locator('select').first();
    this.searchInput = page.getByPlaceholder(/search expenses/i);
  }

  async goto() { await this.page.goto('/finance/expenses'); }

  async createExpense(data: ExpenseFormData) {
    await this.recordExpenseButton.click();
    await this.drawer.waitFor({ state: 'visible' });
    await this.drawer.getByLabel(/expense amount/i).fill(String(data.amount));
    await this.drawer.getByLabel(/date/i).fill(data.date);
    await this.drawer.locator('select').selectOption(data.category);
    if (data.description) {
      await this.drawer.locator('textarea[placeholder*="What was this for"]').fill(data.description);
    }
    await this.drawer.getByRole('button', { name: /save expense/i }).click();
  }

  async editExpense(description: string, data: Partial<ExpenseFormData>) {
    const row = this.getRowByDescription(description);
    // FileText icon button opens the edit drawer
    await row.locator('button').nth(-2).click();
    await this.drawer.waitFor({ state: 'visible' });
    if (data.amount !== undefined) {
      await this.drawer.getByLabel(/expense amount/i).fill(String(data.amount));
    }
    if (data.date) await this.drawer.getByLabel(/date/i).fill(data.date);
    if (data.category) await this.drawer.locator('select').selectOption(data.category);
    if (data.description) {
      await this.drawer.locator('textarea').fill(data.description);
    }
    await this.drawer.getByRole('button', { name: /update expense/i }).click();
  }

  async deleteExpense(description: string) {
    this.page.on('dialog', (dialog) => dialog.accept());
    const row = this.getRowByDescription(description);
    // Trash2 icon is the last button
    await row.locator('button').last().click();
  }

  async filterByCategory(category: string) {
    await this.categoryFilter.selectOption(category);
  }

  async search(query: string) { await this.searchInput.fill(query); }

  getRowByDescription(description: string): Locator { return this.tableRows.filter({ hasText: description }); }
  getToast(): Locator { return this.page.locator('[data-sonner-toaster]'); }
}
