import { type Locator, type Page } from '@playwright/test';

export class AttendancePage {
  readonly datePicker: Locator;
  readonly todayButton: Locator;
  readonly sessionList: Locator;
  readonly attendanceTable: Locator;
  readonly markAllPresentButton: Locator;
  readonly saveBar: Locator;

  constructor(private page: Page) {
    this.datePicker = page.locator('[class*="date"]').first();
    this.todayButton = page.getByRole('button', { name: /today/i });
    // Sessions list is in the lg:col-span-4 left panel
    this.sessionList = page.locator('.lg\\:col-span-4');
    this.attendanceTable = page.locator('table');
    this.markAllPresentButton = page.getByRole('button', { name: /mark all present/i });
    // Sticky save bar at the bottom
    this.saveBar = page.locator('.fixed.bottom-6');
  }

  async goto() { await this.page.goto('/attendance'); }

  async selectSession(className: string) {
    await this.sessionList.getByText(className).click();
  }

  async markStatus(studentName: string, status: 'P' | 'A' | 'L') {
    const row = this.getStudentRow(studentName);
    await row.getByRole('button', { name: status }).click();
  }

  async markStatusWithKeyboard(studentName: string, key: 'p' | 'a' | 'l') {
    const row = this.getStudentRow(studentName);
    await row.click();
    await this.page.keyboard.press(key);
  }

  async toggleHomework(studentName: string) {
    const row = this.getStudentRow(studentName);
    await row.locator('input[type="checkbox"]').click();
  }

  async addNote(studentName: string, note: string) {
    const row = this.getStudentRow(studentName);
    await row.getByPlaceholder(/note\.\.\./i).fill(note);
  }

  async save() {
    // Click the Save Attendance button in the action bar or the sticky save bar
    await this.page.getByRole('button', { name: /save attendance/i }).first().click();
  }

  getStudentRow(name: string): Locator { return this.attendanceTable.locator('tr').filter({ hasText: name }); }
  getToast(): Locator { return this.page.locator('[data-sonner-toaster]'); }
}
