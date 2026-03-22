import { type Page, type Locator } from '@playwright/test';
import { confirmDialog } from '../helpers/confirm-dialog';

export class PayoutsPage {
  /* ── Top-level actions ── */
  readonly addButton: Locator;
  readonly searchInput: Locator;

  /* ── Table ── */
  readonly table: Locator;
  readonly rows: Locator;

  /* ── Toast ── */
  readonly toast: Locator;

  constructor(private page: Page) {
    this.addButton = page.getByRole('button', { name: /add payout/i });
    this.searchInput = page.getByPlaceholder(/search tutors/i);
    this.table = page.locator('table');
    this.rows = page.locator('table tbody tr');
    this.toast = page.locator('[data-sonner-toaster]');
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

  /* ── Create Payout ── */

  /**
   * Open the "Add Payout" modal, fill form fields, and submit.
   *
   * The create-payout modal is a custom fixed overlay (not role="dialog").
   * Form fields: tutor select, amount input, date input, description input.
   */
  async createPayout(data: {
    tutorName: string;
    amount: number;
    date: string;
    description?: string;
  }) {
    await this.addButton.click();

    const modal = this.page.locator('.fixed').last();

    // Tutor is a native <select> inside the modal
    const tutorSelect = modal.locator('select');
    await tutorSelect.selectOption({ label: data.tutorName });

    // Amount — labeled "Amount (Rp)"
    const amountInput = this.page.getByLabel('Amount (Rp)');
    await amountInput.fill(String(data.amount));

    // Date — labeled "Date"
    const dateInput = modal.getByLabel('Date');
    await dateInput.fill(data.date);

    if (data.description) {
      const descInput = this.page.getByLabel('Description (optional)');
      await descInput.fill(data.description);
    }

    // Submit — button "Add Payout" inside the modal footer
    await modal.getByRole('button', { name: /add payout/i }).click();
  }

  /* ── Reconcile Payout ── */

  /**
   * Click the "Reconcile" button on a row, then confirm on the reconciliation view.
   * The reconciliation view shows a "Confirm & Generate Slip" button.
   */
  async reconcilePayout(tutorName: string) {
    const row = this.getRowByName(tutorName);
    await row.getByRole('button', { name: /reconcile/i }).click();

    // On the reconciliation view, click "Confirm & Generate Slip"
    await this.page.getByRole('button', { name: /confirm/i }).click();
  }

  /* ── Delete Payout ── */

  /**
   * Click the delete (X) button on a row and confirm via ConfirmDialog (role="alertdialog").
   */
  async deletePayout(tutorName: string) {
    const row = this.getRowByName(tutorName);
    // The delete button is the last button in the row actions (an X icon button)
    await row.locator('button').last().click();

    await confirmDialog(this.page);
  }
}
