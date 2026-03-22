import { type Page, type Locator } from '@playwright/test';
import { confirmDialog } from '../helpers/confirm-dialog.js';

export class PayoutsPage {
  /* ── Top-level actions ── */
  readonly addButton: Locator;
  readonly searchInput: Locator;

  /* ── Filters ── */
  readonly statusFilter: Locator;

  /* ── Table ── */
  readonly table: Locator;
  readonly rows: Locator;

  /* ── Pagination ── */
  readonly pagination: Locator;

  /* ── Empty state ── */
  readonly emptyState: Locator;

  /* ── Bulk actions ── */
  readonly generateSalariesButton: Locator;
  readonly exportCsvButton: Locator;

  /* ── Toast ── */
  readonly toast: Locator;

  constructor(private page: Page) {
    // "New Payout" / "Add Payout" button text from t('payouts.newPayout')
    this.addButton = page.getByRole('button', { name: /new payout|add payout/i });
    this.searchInput = page.getByPlaceholder(/search/i);

    // Status filter is a native <select> — the one in PageHeader after the search input
    // There are potentially multiple selects; the status filter is the first native <select> visible
    this.statusFilter = page.locator('select').first();

    this.table = page.locator('table');
    this.rows = page.locator('table tbody tr');

    // Pagination is rendered as a custom div below the table
    this.pagination = page.locator('.p-4.border-t');

    // Empty state is a centered div inside the table when no data
    this.emptyState = page.locator('td[colspan]');

    // Generate salaries button — text from t('payouts.generateSalaries')
    this.generateSalariesButton = page.getByRole('button', { name: /generate salar/i });

    // Export CSV button — not directly present in TutorPayouts, but may be added
    this.exportCsvButton = page.getByRole('button', { name: /export/i });

    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/finance/payouts');
  }

  /* ── Row helpers ── */

  getRowByName(name: string): Locator {
    return this.rows.filter({ hasText: name });
  }

  getToast(): Locator {
    return this.toast;
  }

  /* ── Search ── */

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  /* ── Filter by status ── */

  async filterByStatus(status: '' | 'PENDING' | 'PROCESSING' | 'PAID') {
    await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.url().includes('/api/admin/payouts') && resp.request().method() === 'GET',
      ),
      this.statusFilter.selectOption(status),
    ]);
  }

  /* ── Create Payout ── */

  /**
   * Open the "New Payout" modal, fill form fields, and submit.
   * The modal is a fixed overlay. Form fields:
   * - tutor: native <select> (first in modal)
   * - period start/end: date inputs (first two)
   * - amount: number input
   * - date: date input (third)
   * - description: text input
   */
  async createPayout(data: {
    tutorName: string;
    amount: number;
    date: string;
    description?: string;
    periodStart?: string;
    periodEnd?: string;
  }) {
    await this.addButton.click();

    const modal = this.page.locator('.fixed.inset-0').last();

    // Tutor — first native <select> inside the modal
    const tutorSelect = modal.locator('select').first();
    await tutorSelect.selectOption({ label: data.tutorName });

    if (data.periodStart) {
      await modal.locator('input[type="date"]').first().fill(data.periodStart);
    }
    if (data.periodEnd) {
      await modal.locator('input[type="date"]').nth(1).fill(data.periodEnd);
    }

    // Amount — number input
    const amountInput = modal.locator('input[type="number"]');
    await amountInput.fill(String(data.amount));

    // Date — the date input after period dates (index depends on period fields)
    const dateInputs = modal.locator('input[type="date"]');
    const dateCount = await dateInputs.count();
    // Date input is the last date input (after period start/end)
    await dateInputs.nth(dateCount - 1).fill(data.date);

    if (data.description) {
      // Description — a text input (not date, not number)
      const descInput = modal.locator('input:not([type="date"]):not([type="number"])').last();
      await descInput.fill(data.description);
    }

    // Submit — button text from t('payouts.modal.createPayout')
    const submitButton = modal.getByRole('button', { name: /create payout|add payout/i });
    await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.url().includes('/api/admin/payouts') && resp.request().method() === 'POST',
      ),
      submitButton.click(),
    ]);
  }

  /* ── Reconcile Payout ── */

  /**
   * Click the "Reconcile" button on a row, optionally adjust bonus/deduction,
   * then confirm on the reconciliation view.
   */
  async reconcilePayout(
    tutorName: string,
    data?: { bonus?: number; deduction?: number },
  ) {
    const row = this.getRowByName(tutorName);
    await row.getByRole('button', { name: /reconcile/i }).click();

    // On the reconciliation view, optionally fill bonus and deduction
    if (data?.bonus !== undefined) {
      // Bonus is the first number input in the right-side summary card
      const bonusInput = this.page.locator('input[type="number"]').first();
      await bonusInput.fill(String(data.bonus));
    }

    if (data?.deduction !== undefined) {
      // Deduction is the second number input
      const deductionInput = this.page.locator('input[type="number"]').nth(1);
      await deductionInput.fill(String(data.deduction));
    }

    // Click "Confirm & Generate Slip" — text from t('payouts.confirmGenerateSlip')
    const confirmButton = this.page.getByRole('button', { name: /confirm/i });
    await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.url().includes('/api/admin/payouts') && resp.request().method() === 'PATCH',
      ),
      confirmButton.click(),
    ]);
  }

  /* ── Upload Proof ── */

  /**
   * Upload a proof file in the reconciliation view.
   * Must be in reconciliation view already (call reconcilePayout first without confirm,
   * or navigate to reconciliation).
   */
  async uploadProof(tutorName: string, filePath: string) {
    // Navigate to reconciliation view first
    const row = this.getRowByName(tutorName);
    await row.getByRole('button', { name: /reconcile|view slip/i }).click();

    // The file input is hidden; set the file via input[type="file"]
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
  }

  /* ── Generate Slip ── */

  async generateSlip(tutorName: string) {
    // Must be in reconciliation view for a PAID payout
    const row = this.getRowByName(tutorName);
    await row.getByRole('button', { name: /view slip/i }).click();

    const slipButton = this.page.getByRole('button', { name: /download payout slip|generate slip/i });
    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/payouts') &&
          resp.url().includes('slip'),
      ),
      slipButton.click(),
    ]);
  }

  /* ── Generate Salaries ── */

  async generateSalaries() {
    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/payouts') &&
          resp.url().includes('generate-salaries') &&
          resp.request().method() === 'POST',
      ),
      this.generateSalariesButton.click(),
    ]);
  }

  /* ── Export CSV ── */

  async exportCsv() {
    await this.exportCsvButton.click();
  }

  /* ── Delete Payout ── */

  async deletePayout(tutorName: string) {
    const row = this.getRowByName(tutorName);
    // Delete button is the X icon — last button in row actions
    await row.locator('button').last().click();

    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/payouts') && resp.request().method() === 'DELETE',
      ),
      confirmDialog(this.page),
    ]);
  }
}
