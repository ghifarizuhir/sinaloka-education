import { type Page, type Locator } from '@playwright/test';

export class AttendancePage {
  /* ── Left panel: session list ── */
  readonly sessionPanel: Locator;

  /* ── Right panel: attendance table ── */
  readonly table: Locator;

  /* ── Actions ── */
  readonly saveButton: Locator;
  readonly markAllPresentButton: Locator;

  /* ── Toast ── */
  readonly toast: Locator;

  constructor(private page: Page) {
    this.sessionPanel = page.locator('.lg\\:col-span-4');
    this.table = page.locator('table');
    this.saveButton = page.getByRole('button', { name: /save attendance/i });
    this.markAllPresentButton = page.getByRole('button', { name: /mark all present/i });
    this.toast = page.locator('[data-sonner-toaster]');
  }

  async goto() {
    await this.page.goto('/attendance');
  }

  /** Click a session card by its class name text in the left panel */
  async selectSession(className: string) {
    await this.sessionPanel
      .locator('button')
      .filter({ hasText: className })
      .click();
  }

  /** Get a student row from the attendance table */
  getStudentRow(name: string): Locator {
    return this.table.locator('tr').filter({ hasText: name });
  }

  /** Mark a student's attendance status (P = Present, A = Absent, L = Late) */
  async markStatus(studentName: string, status: 'P' | 'A' | 'L') {
    const row = this.getStudentRow(studentName);
    await row.getByRole('button', { name: status, exact: true }).click();
  }

  /** Toggle the homework checkbox for a student */
  async toggleHomework(studentName: string) {
    const row = this.getStudentRow(studentName);
    await row.locator('input[type="checkbox"]').click();
  }

  /** Add a note for a student */
  async addNote(studentName: string, note: string) {
    const row = this.getStudentRow(studentName);
    await row.getByPlaceholder(/note/i).fill(note);
  }

  /** Click the Save Attendance button */
  async save() {
    await this.saveButton.click();
  }

  /** Mark all students as present */
  async markAllPresent() {
    await this.markAllPresentButton.click();
  }

  /** Return the toast locator for assertions */
  getToast(): Locator {
    return this.toast;
  }
}
