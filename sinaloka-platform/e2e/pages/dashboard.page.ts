import { type Page, type Locator } from '@playwright/test';

export class DashboardPage {
  /* ── Stat cards ── */
  readonly totalStudents: Locator;
  readonly activeTutors: Locator;
  readonly attendanceRate: Locator;
  readonly monthlyRevenue: Locator;

  /* ── Sections ── */
  readonly recentActivity: Locator;
  readonly upcomingSessions: Locator;

  /* ── Quick links ── */
  readonly viewAllStudentsLink: Locator;
  readonly manageFinanceLink: Locator;
  readonly attendanceRecordsLink: Locator;
  readonly scheduleLink: Locator;

  /* ── Command palette ── */
  readonly quickActionsButton: Locator;
  readonly commandPaletteInput: Locator;

  /* ── Alert chips ── */
  readonly overdueAlert: Locator;

  /* ── Toast ── */
  readonly toast: Locator;

  constructor(private page: Page) {
    /* Stat cards */
    this.totalStudents = page.getByText('Total Students');
    this.activeTutors = page.getByText('Active Tutors');
    this.attendanceRate = page.getByText('Attendance Rate', { exact: false });
    this.monthlyRevenue = page.getByText('Monthly Revenue');

    /* Sections */
    this.recentActivity = page.getByText('Recent Activity');
    this.upcomingSessions = page.getByText('Upcoming Sessions');

    /* Quick links — these are native <button> elements */
    this.viewAllStudentsLink = page.getByRole('button', { name: /view all students/i });
    this.manageFinanceLink = page.getByRole('button', { name: /manage finance/i });
    this.attendanceRecordsLink = page.getByRole('button', { name: /attendance records/i });
    this.scheduleLink = page.getByRole('button', { name: /schedule/i });

    /* Command palette */
    this.quickActionsButton = page.getByRole('button', { name: /quick actions/i });
    this.commandPaletteInput = page.getByPlaceholder(/search for students/i);

    /* Overdue alert chip */
    this.overdueAlert = page.locator('button').filter({ hasText: /overdue/i });

    /* Toast */
    this.toast = page.locator('[data-sonner-toaster]');
  }

  async goto() {
    await this.page.goto('/');
  }

  async openCommandPalette() {
    await this.quickActionsButton.click();
  }

  getStatCard(label: string): Locator {
    return this.page.getByText(label);
  }

  async clickQuickLink(name: string) {
    await this.page.getByRole('button', { name: new RegExp(name, 'i') }).click();
  }

  getToast(): Locator {
    return this.toast;
  }
}
