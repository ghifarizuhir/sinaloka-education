import { type Page, type Locator } from '@playwright/test';
import { confirmDialog } from '../helpers/confirm-dialog.js';

export class PaymentsPage {
  /* ── Top-level actions ── */
  readonly statusFilter: Locator;

  /* ── Table ── */
  readonly table: Locator;
  readonly rows: Locator;

  /* ── Overdue summary cards ── */
  readonly overdueSummary: Locator;
  readonly overdueCount: Locator;
  readonly overdueAmount: Locator;

  /* ── Pagination ── */
  readonly pagination: Locator;

  /* ── Empty state ── */
  readonly emptyState: Locator;

  /* ── Batch actions ── */
  readonly selectAllCheckbox: Locator;
  readonly batchRecordButton: Locator;

  /* ── Toast ── */
  readonly toast: Locator;

  constructor(private page: Page) {
    // Select component renders a native <select>; the status filter is in the PageHeader
    this.statusFilter = page.locator('select').first();

    this.table = page.locator('table');
    this.rows = page.locator('table tbody tr');

    // Summary cards: grid of 4 cards above the table
    // Cards render as: Total Records, Overdue Count, Overdue Amount, Flagged Students
    this.overdueSummary = page.locator('.grid.grid-cols-1.md\\:grid-cols-4');
    this.overdueCount = this.overdueSummary.locator('> div').nth(1);
    this.overdueAmount = this.overdueSummary.locator('> div').nth(2);

    // Pagination component is rendered inside the Card below the table
    this.pagination = page.locator('nav[aria-label]').or(page.locator('.p-4.border-t'));

    // Empty state is a centered div inside the table when no data
    this.emptyState = page.locator('td[colspan]');

    // Select all checkbox is in the table header (first <th>)
    // Checkbox component renders as a <button> with click toggle
    this.selectAllCheckbox = page.locator('thead button').first();

    // Batch record button appears when selections exist
    this.batchRecordButton = page.getByRole('button', { name: /record.*batch|batch/i });

    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/finance/payments');
  }

  /* ── Row helpers ── */

  getRowByName(name: string): Locator {
    return this.rows.filter({ hasText: name });
  }

  getToast(): Locator {
    return this.toast;
  }

  /* ── Filter ── */

  async filterByStatus(status: 'all' | 'PAID' | 'PENDING' | 'OVERDUE') {
    await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.url().includes('/api/admin/payments') && resp.request().method() === 'GET',
      ),
      this.statusFilter.selectOption(status),
    ]);
  }

  /* ── Record Payment ── */

  /**
   * Returns the record payment button locator for a given row.
   * Uses the title attribute set on the button.
   */
  getRecordPaymentButton(studentName: string): Locator {
    const row = this.getRowByName(studentName);
    return row.locator('button').filter({ has: this.page.locator('svg.lucide-dollar-sign') }).first();
  }

  /**
   * Click the record payment button on a row, fill the modal, and confirm.
   * The modal is a fixed overlay with form fields.
   */
  async recordPayment(
    studentName: string,
    data: {
      amount?: number;
      method?: 'CASH' | 'TRANSFER' | 'OTHER';
      discount?: number;
      date?: string;
    } = {},
  ) {
    const row = this.getRowByName(studentName);
    // Record payment button has DollarSign icon — it's the first action button for unpaid rows
    await row.locator('button').first().click();

    // Wait for the modal overlay to appear
    const modal = this.page.locator('.fixed.inset-0').last().locator('.bg-white, .dark\\:bg-zinc-900').last();

    if (data.amount !== undefined) {
      // Payment amount — first number input in the modal
      const amountInput = modal.locator('input[type="number"]').first();
      await amountInput.fill(String(data.amount));
    }

    if (data.discount !== undefined) {
      // Discount — second number input in the modal
      const discountInput = modal.locator('input[type="number"]').nth(1);
      await discountInput.fill(String(data.discount));
    }

    if (data.date !== undefined) {
      // Date — date input in the modal
      await modal.locator('input[type="date"]').fill(data.date);
    }

    if (data.method) {
      // Method — native <select> inside the modal
      await modal.locator('select').selectOption(data.method);
    }

    // Click "Confirm Payment" — button text from t('payments.modal.confirmPayment')
    const confirmButton = this.page.getByRole('button', { name: /confirm payment/i });
    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/payments') && resp.request().method() === 'PATCH',
      ),
      confirmButton.click(),
    ]);
  }

  /* ── Delete Payment ── */

  async deletePayment(studentName: string) {
    const row = this.getRowByName(studentName);
    // Delete button has Trash2 icon — last action button in the row
    await row.locator('button').last().click();

    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/payments') && resp.request().method() === 'DELETE',
      ),
      confirmDialog(this.page),
    ]);
  }

  /* ── Generate Invoice ── */

  async generateInvoice(studentName: string) {
    const row = this.getRowByName(studentName);
    // Generate invoice button has FileText icon
    // It appears when there's no invoice_url — look for the title attribute
    const invoiceBtn = row.locator('button').filter({
      has: this.page.locator('svg.lucide-file-text'),
    });
    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/payments') &&
          resp.url().includes('invoice') &&
          resp.request().method() === 'POST',
      ),
      invoiceBtn.click(),
    ]);
  }

  /* ── Send Reminder ── */

  async sendReminder(studentName: string) {
    const row = this.getRowByName(studentName);
    // Send reminder button has Send icon
    const reminderBtn = row.locator('button').filter({
      has: this.page.locator('svg.lucide-send'),
    });
    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/payments') &&
          resp.url().includes('remind') &&
          resp.request().method() === 'POST',
      ),
      reminderBtn.click(),
    ]);
  }

  /* ── Selection ── */

  async selectPayment(studentName: string) {
    const row = this.getRowByName(studentName);
    // Checkbox is a <button> element in the first cell
    await row.locator('td').first().locator('button').click();
  }

  async selectAll() {
    await this.selectAllCheckbox.click();
  }

  /* ── Batch Record ── */

  async batchRecordPayments(data: { date: string; method: string }) {
    await this.batchRecordButton.click();

    const modal = this.page.locator('.fixed.inset-0').last().locator('.bg-white, .dark\\:bg-zinc-900').last();

    // Date input
    await modal.locator('input[type="date"]').fill(data.date);

    // Method — native <select>
    await modal.locator('select').selectOption(data.method);

    // Confirm — button text from t('payments.modal.confirmPayment')
    const confirmButton = modal.getByRole('button', { name: /confirm payment/i });
    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/payments') &&
          resp.url().includes('batch') &&
          resp.request().method() === 'POST',
      ),
      confirmButton.click(),
    ]);
  }
}
