import { type Page, type Locator } from '@playwright/test';

export class DashboardPage {
  /* -- Stat cards -- */
  readonly totalStudents: Locator;
  readonly activeTutors: Locator;
  readonly attendanceRate: Locator;
  readonly monthlyRevenue: Locator;

  /* -- Sections -- */
  readonly recentActivity: Locator;
  readonly upcomingSessions: Locator;

  /* -- Quick links -- */
  readonly viewAllStudentsLink: Locator;
  readonly manageFinanceLink: Locator;
  readonly attendanceRecordsLink: Locator;
  readonly scheduleLink: Locator;

  /* -- Command palette -- */
  readonly quickActionsButton: Locator;
  readonly commandPaletteInput: Locator;

  /* -- Alert chips -- */
  readonly overdueAlert: Locator;

  /* -- Toast -- */
  readonly toast: Locator;

  /* -- Activity feed items -- */
  readonly activityFeedItems: Locator;

  /* -- Upcoming session items -- */
  readonly upcomingSessionItems: Locator;

  /* -- Command palette results & no results -- */
  readonly commandPaletteResults: Locator;
  readonly commandPaletteNoResults: Locator;

  constructor(private page: Page) {
    /* Stat cards - each card has a label in a <p> with text-xs text-muted-foreground */
    this.totalStudents = page.getByText('Total Students');
    this.activeTutors = page.getByText('Active Tutors');
    this.attendanceRate = page.getByText('Attendance Rate').first();
    this.monthlyRevenue = page.getByText('Monthly Revenue');

    /* Sections */
    this.recentActivity = page.getByText('Recent Activity');
    this.upcomingSessions = page.getByRole('heading', { name: 'Upcoming Sessions' });

    /* Quick links - these are native <button> elements */
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
    this.toast = page.locator('[data-sonner-toast]');

    /* Activity feed - each item is a motion.div with flex items-center gap-3 containing description */
    this.activityFeedItems = page.locator('.space-y-1 > div').filter({
      has: page.locator('.w-8.h-8'),
    });

    /* Upcoming session items - each session card has Calendar icon + subject_name */
    this.upcomingSessionItems = page.locator('.space-y-1 > div').filter({
      has: page.locator('.bg-blue-500\\/10'),
    });

    /* Command palette result buttons */
    this.commandPaletteResults = page.locator('.max-h-\\[50vh\\] button');

    /* Command palette no results text */
    this.commandPaletteNoResults = page.locator('.max-h-\\[50vh\\]').getByText(/no results/i);
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

  /**
   * Gets the numeric value displayed in a stat card.
   * In Dashboard.tsx, each stat card has structure:
   *   <p class="text-2xl font-bold">{value}</p>
   *   <p class="text-xs text-muted-foreground">{label}</p>
   * So the value is the sibling element preceding the label text.
   */
  getStatCardValue(label: string): Locator {
    // The card contains both the label and the value. The value is the text-2xl element.
    const card = this.page.locator('[class*="cursor-default"]').filter({ hasText: label });
    return card.locator('.text-2xl');
  }

  async clickQuickLink(name: string) {
    await this.page.getByRole('button', { name: new RegExp(name, 'i') }).click();
  }

  /**
   * Waits for the dashboard stats API response to complete.
   */
  async waitForDashboardData() {
    await this.page.waitForResponse(resp =>
      resp.url().includes('/api/admin/dashboard/stats') && resp.status() === 200
    );
  }

  getToast(): Locator {
    return this.toast;
  }
}
