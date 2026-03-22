import { type Page, type Locator } from '@playwright/test';

export class AttendancePage {
  /* -- Left panel: session list -- */
  readonly sessionPanel: Locator;

  /* -- Right panel: attendance table -- */
  readonly table: Locator;

  /* -- Actions -- */
  readonly saveButton: Locator;
  readonly markAllPresentButton: Locator;

  /* -- Present counter display (e.g., "5 / 10") -- */
  readonly presentCounter: Locator;

  /* -- Monthly summary stats section -- */
  readonly monthlySummary: Locator;

  /* -- Date navigation -- */
  readonly prevDateButton: Locator;
  readonly nextDateButton: Locator;
  readonly todayButton: Locator;

  /* -- Empty state (no sessions for date or no session selected) -- */
  readonly emptyState: Locator;

  /* -- Discard changes button (in sticky bar) -- */
  readonly discardButton: Locator;

  /* -- Sticky save bar at bottom -- */
  readonly stickyBar: Locator;

  /* -- Toast -- */
  readonly toast: Locator;

  constructor(private page: Page) {
    this.sessionPanel = page.locator('.lg\\:col-span-4');
    this.table = page.locator('table');

    // Save button — text from t('attendance.saveAttendance')
    this.saveButton = page.getByRole('button', { name: /save attendance/i });
    // Mark all present button — text from t('attendance.markAllPresent')
    this.markAllPresentButton = page.getByRole('button', { name: /mark all present/i });

    // Present counter: "N / M" displayed in the session header as a 2xl font
    this.presentCounter = page.locator('.text-2xl.font-bold');

    // Monthly summary: grid with 4 stat cards (rate, present, absent, late)
    this.monthlySummary = page.locator('.grid.grid-cols-4.gap-2');

    // Date navigation buttons in the date picker card
    const dateCard = page.locator('.lg\\:col-span-4');
    this.prevDateButton = dateCard.locator('button').filter({
      has: page.locator('svg'),
    }).first();
    this.todayButton = dateCard.getByRole('button', { name: /today/i });
    this.nextDateButton = dateCard.locator('button').filter({
      has: page.locator('svg'),
    }).nth(1);

    // Empty state — shown when no session is selected
    this.emptyState = page.locator('.border-dashed.border-2');

    // Sticky save bar at bottom (fixed position)
    this.stickyBar = page.locator('.fixed.bottom-6');

    // Discard button — text from t('common.discard')
    this.discardButton = page.getByRole('button', { name: /discard/i });

    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/attendance');
  }

  /** Click a session card by its class name text in the left panel */
  async selectSession(className: string) {
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/sessions') &&
        resp.url().includes('/students') &&
        resp.request().method() === 'GET'
      ),
      this.sessionPanel
        .locator('button')
        .filter({ hasText: className })
        .click(),
    ]);
  }

  /** Get a student row from the attendance table */
  getStudentRow(name: string): Locator {
    return this.table.locator('tr').filter({ hasText: name });
  }

  /**
   * Mark a student's attendance status.
   * Status buttons show single letters: P (Present), A (Absent), L (Late).
   * The buttons render STATUS_LABEL[status][0] which gives the first character.
   */
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

  /** Click the Save Attendance button and wait for the API response */
  async save() {
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/api/admin/attendance') && resp.request().method() === 'PATCH'
      ),
      this.saveButton.click(),
    ]);
  }

  /** Mark all students as present */
  async markAllPresent() {
    await this.markAllPresentButton.click();
  }

  /** Navigate dates using prev / next / today buttons */
  async navigateDate(direction: 'prev' | 'next' | 'today') {
    if (direction === 'prev') {
      await this.prevDateButton.click();
    } else if (direction === 'next') {
      await this.nextDateButton.click();
    } else {
      await this.todayButton.click();
    }
  }

  /** Return the toast locator for assertions */
  getToast(): Locator {
    return this.toast;
  }
}
