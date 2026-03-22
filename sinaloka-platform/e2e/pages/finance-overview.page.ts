import { type Page, type Locator } from '@playwright/test';

export class FinanceOverviewPage {
  /* ── Stat cards (text-matched) ── */
  readonly totalRevenue: Locator;
  readonly totalPayouts: Locator;
  readonly totalExpenses: Locator;
  readonly netProfit: Locator;

  /* ── Period tabs ── */
  readonly thisMonthTab: Locator;
  readonly thisQuarterTab: Locator;
  readonly yearToDateTab: Locator;
  readonly customTab: Locator;

  /* ── Actions ── */
  readonly generateReportButton: Locator;

  /* ── Quick nav links ── */
  readonly studentPaymentsLink: Locator;
  readonly tutorPayoutsLink: Locator;
  readonly operatingExpensesLink: Locator;

  /* ── Toast ── */
  readonly toast: Locator;

  constructor(private page: Page) {
    // Finance overview uses responsive layout with duplicate stat card elements.
    // Some are hidden on mobile (md:hidden), some on desktop (hidden md:grid).
    // Use nth/last to pick the visible one on Desktop Chrome (1280px = md+).
    this.totalRevenue = page.getByText(/total revenue/i).first();
    this.totalPayouts = page.getByText(/total payouts/i).first();
    // Expenses: first instance is mobile (md:hidden), last is desktop (hidden md:grid)
    this.totalExpenses = page.getByText(/total expenses/i).last();
    this.netProfit = page.getByText(/net profit/i).first();

    this.thisMonthTab = page.getByRole('button', { name: /this month/i });
    this.thisQuarterTab = page.getByRole('button', { name: /this quarter/i });
    this.yearToDateTab = page.getByRole('button', { name: /year to date/i });
    this.customTab = page.getByRole('button', { name: /custom/i });

    this.generateReportButton = page.getByRole('button', { name: /generate report/i });

    this.studentPaymentsLink = page.getByRole('link', { name: /student payments/i }).first();
    this.tutorPayoutsLink = page.getByRole('link', { name: /tutor payouts/i }).first();
    this.operatingExpensesLink = page.getByRole('link', { name: /operating expenses/i }).first();

    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/finance');
  }

  /* ── Period selection ── */

  async selectPeriod(period: 'This Month' | 'This Quarter' | 'Year to Date' | 'Custom' | string) {
    await this.page.getByRole('button', { name: new RegExp(period, 'i') }).click();
  }

  /* ── Stat card helper ── */

  getStatCard(label: string): Locator {
    return this.page.getByText(new RegExp(label, 'i')).first();
  }

  /* ── Report modal ── */

  private get modal(): Locator {
    return this.page.getByRole('dialog');
  }

  async openReportModal() {
    await this.generateReportButton.click();
  }

  async selectReportTab(tab: 'Finance' | 'Attendance' | 'Student Progress' | string) {
    await this.modal.getByRole('button', { name: new RegExp(`^${tab}$`, 'i') }).click();
  }

  async fillReportDates(from: string, to: string) {
    const dateInputs = this.modal.locator('input[type="date"]');
    await dateInputs.first().fill(from);
    await dateInputs.last().fill(to);
  }

  async generateReport() {
    await this.modal.getByRole('button', { name: /^generate$/i }).click();
  }

  async downloadPdf() {
    await this.modal.getByRole('button', { name: /download pdf/i }).click();
  }

  getToast(): Locator {
    return this.toast;
  }
}
