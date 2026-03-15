import { type Locator, type Page } from '@playwright/test';

export class StudentPaymentsPage {
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly statusFilter: Locator;
  readonly modal: Locator;

  constructor(private page: Page) {
    this.table = page.locator('table');
    this.tableRows = page.locator('table tbody tr');
    this.statusFilter = page.locator('select').first();
    // The record payment modal is a custom motion div (not role="dialog"),
    // so target the heading inside it
    this.modal = page.locator('.fixed.inset-0 .bg-white, .fixed.inset-0 .dark\\:bg-zinc-900').filter({ hasText: /record payment/i });
  }

  async goto() { await this.page.goto('/finance/payments'); }

  async recordPayment(studentName: string, options?: { amount?: number; discount?: number; method?: string; sendReceipt?: boolean }) {
    const row = this.getRowByStudentName(studentName);
    // Click the DollarSign (Record Payment) icon button
    await row.locator('button[title="Record Payment"]').click();
    await this.page.getByRole('heading', { name: /record payment/i }).waitFor({ state: 'visible' });

    // The modal uses Label components without htmlFor - locate inputs by their position in the modal
    const modal = this.page.locator('.bg-white, .dark\\:bg-zinc-900').filter({ hasText: /record payment/i }).last();
    if (options?.amount !== undefined) {
      // First number input is payment amount
      await modal.locator('input[type="number"]').first().fill(String(options.amount));
    }
    if (options?.discount !== undefined) {
      // Second number input is discount
      await modal.locator('input[type="number"]').nth(1).fill(String(options.discount));
    }
    if (options?.method) {
      // The select element for method
      await modal.locator('select').selectOption(options.method);
    }
    await this.page.getByRole('button', { name: /confirm payment/i }).click();
  }

  async deletePayment(studentName: string) {
    this.page.on('dialog', (dialog) => dialog.accept());
    const row = this.getRowByStudentName(studentName);
    await row.locator('button[title="Delete"]').click();
  }

  async filterByStatus(status: 'all' | 'PAID' | 'PENDING' | 'OVERDUE') {
    await this.statusFilter.selectOption(status);
  }

  getRowByStudentName(name: string): Locator { return this.tableRows.filter({ hasText: name }); }
  getToast(): Locator { return this.page.locator('[data-sonner-toaster]'); }
}
