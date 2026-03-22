import { type Page, type Locator } from '@playwright/test';
import { confirmDialog } from '../helpers/confirm-dialog';

export class PaymentsPage {
  /* ── Top-level actions ── */
  readonly statusFilter: Locator;

  /* ── Table ── */
  readonly table: Locator;
  readonly rows: Locator;

  /* ── Toast ── */
  readonly toast: Locator;

  constructor(private page: Page) {
    // The status filter is the first native <select> on the page (inside PageHeader actions)
    this.statusFilter = page.locator('select').first();
    this.table = page.locator('table');
    this.rows = page.locator('table tbody tr');
    this.toast = page.locator('[data-sonner-toaster]');
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
    await this.statusFilter.selectOption(status);
  }

  /* ── Record Payment ── */

  /**
   * Click the "Record Payment" button on a row, fill the modal, and confirm.
   *
   * The record-payment modal is a custom fixed overlay (not role="dialog").
   * We target it as the last `.fixed` overlay visible on the page.
   */
  async recordPayment(
    studentName: string,
    data: { amount?: number; method?: 'CASH' | 'TRANSFER' | 'OTHER'; discount?: number } = {},
  ) {
    const row = this.getRowByName(studentName);
    await row.locator('button[title="Record Payment"]').click();

    // The modal is a fixed overlay — locate form fields by their labels
    const modal = this.page.locator('.fixed').last();

    if (data.amount !== undefined) {
      const amountInput = this.page.getByLabel('Payment Amount (Rp)');
      await amountInput.fill(String(data.amount));
    }

    if (data.discount !== undefined) {
      const discountInput = this.page.getByLabel('Discount / Adj (Rp)');
      await discountInput.fill(String(data.discount));
    }

    if (data.method) {
      // Method is the second <select> on the page (first is status filter, second is in the modal)
      const methodSelect = modal.locator('select');
      await methodSelect.selectOption(data.method);
    }

    // Click "Confirm Payment"
    await this.page.getByRole('button', { name: /confirm payment/i }).click();
  }

  /* ── Delete Payment ── */

  /**
   * Click the delete button on a row and confirm via ConfirmDialog (role="alertdialog").
   */
  async deletePayment(studentName: string) {
    const row = this.getRowByName(studentName);
    await row.locator('button[title="Delete"]').click();

    await confirmDialog(this.page);
  }
}
