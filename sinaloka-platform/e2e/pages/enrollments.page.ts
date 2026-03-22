import { type Page, type Locator } from '@playwright/test';
import { confirmDialog } from '../helpers/confirm-dialog';

export class EnrollmentsPage {
  /* ── Top-level actions ── */
  readonly addButton: Locator;
  readonly searchInput: Locator;

  /* ── Table ── */
  readonly table: Locator;
  readonly rows: Locator;

  /* ── Toast ── */
  readonly toast: Locator;

  constructor(private page: Page) {
    this.addButton = page.getByRole('button', { name: /add enrollment/i });
    this.searchInput = page.getByPlaceholder(/search student or class/i);
    this.table = page.locator('table');
    this.rows = page.locator('table tbody tr');
    this.toast = page.locator('[data-sonner-toaster]');
  }

  async goto() {
    await this.page.goto('/enrollments');
  }

  /* ── Modal helpers ── */

  private get modal(): Locator {
    return this.page.getByRole('dialog');
  }

  /**
   * Open the "Add Enrollment" modal, select a student and class, then enroll.
   * The new-enrollment modal uses a click-to-select list (not form inputs).
   */
  async enrollStudent(studentName: string, className: string) {
    await this.addButton.click();
    const modal = this.modal;

    // Search and select student
    await modal.getByPlaceholder(/search students/i).fill(studentName);
    await modal.getByText(studentName, { exact: true }).click();

    // Select class
    await modal.getByText(className, { exact: true }).click();

    // Click the enroll button (text: "Enroll N Students")
    await modal.getByRole('button', { name: /enroll/i }).click();
  }

  /**
   * Open the edit modal for an enrollment row, change status, and save.
   * The edit modal uses a native <select> for status.
   */
  async changeStatus(studentName: string, newStatus: string) {
    await this.openRowMenu(studentName);
    await this.page.getByText(/edit enrollment/i).click();

    const modal = this.modal;
    await modal.locator('select').selectOption(newStatus);
    await modal.getByRole('button', { name: /save changes/i }).click();
  }

  /**
   * Delete an enrollment via the row dropdown menu.
   * Uses ConfirmDialog (role="alertdialog").
   */
  async deleteEnrollment(studentName: string) {
    await this.openRowMenu(studentName);
    await this.page.getByText(/delete record/i).click();

    await confirmDialog(this.page);
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  getRowByName(name: string): Locator {
    return this.rows.filter({ hasText: name });
  }

  async openRowMenu(name: string) {
    const row = this.getRowByName(name);
    // The MoreHorizontal icon is the last button in each row
    await row.locator('button').last().click();
  }

  getToast(): Locator {
    return this.toast;
  }
}
