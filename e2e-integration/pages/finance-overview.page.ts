import { type Page, type Locator } from '@playwright/test';

export class FinanceOverviewPage {
  /* ── Stat cards (text-matched) ── */
  readonly totalRevenue: Locator;
  readonly totalPayouts: Locator;
  readonly totalExpenses: Locator;
  readonly netProfit: Locator;

  /* ── Stat card values ── */
  readonly totalRevenueValue: Locator;
  readonly totalPayoutsValue: Locator;
  readonly totalExpensesValue: Locator;
  readonly netProfitValue: Locator;

  /* ── Net profit container (for CSS theme check) ── */
  readonly netProfitContainer: Locator;

  /* ── Period tabs ── */
  readonly thisMonthTab: Locator;
  readonly thisQuarterTab: Locator;
  readonly yearToDateTab: Locator;
  readonly customTab: Locator;

  /* ── Custom date inputs ── */
  readonly customDateFrom: Locator;
  readonly customDateTo: Locator;

  /* ── Actions ── */
  readonly generateReportButton: Locator;
  readonly exportDropdown: Locator;

  /* ── Breakdown sections ── */
  readonly revenueByClass: Locator;
  readonly revenueByMethod: Locator;
  readonly revenueByStatus: Locator;
  readonly expenseByCategory: Locator;

  /* ── Quick nav links ── */
  readonly studentPaymentsLink: Locator;
  readonly tutorPayoutsLink: Locator;
  readonly operatingExpensesLink: Locator;

  /* ── Toast ── */
  readonly toast: Locator;

  constructor(private page: Page) {
    // Finance overview uses responsive layout with duplicate stat card elements.
    // Use first() to pick the first instance visible.
    this.totalRevenue = page.getByText(/total revenue/i).first();
    this.totalPayouts = page.getByText(/total payouts/i).first();
    this.totalExpenses = page.getByText(/total expenses/i).last();
    this.netProfit = page.getByText(/net profit/i).first();

    // Value locators — the actual formatted currency values
    // Revenue value is the <p> with the bold currency text inside the emerald card
    this.totalRevenueValue = page.locator('.bg-emerald-500\\/5').first().locator('p.font-bold').first();
    this.totalPayoutsValue = page.locator('.bg-blue-500\\/5').first().locator('p.font-bold').first();
    this.totalExpensesValue = page.locator('.bg-amber-500\\/5').first().locator('p.font-bold').first();
    // Net profit value is in the bottom accent bar
    this.netProfitValue = page.locator('.text-2xl.font-bold, .md\\:text-3xl.font-bold').last();

    // Net profit container — the outer div with conditional emerald/red classes
    this.netProfitContainer = page.locator('.p-5.rounded-2xl.border').last();

    // Period tabs — rendered via Tabs component as buttons
    this.thisMonthTab = page.getByRole('button', { name: /this month/i });
    this.thisQuarterTab = page.getByRole('button', { name: /this quarter/i });
    this.yearToDateTab = page.getByRole('button', { name: /year to date/i });
    this.customTab = page.getByRole('button', { name: /custom/i });

    // Custom date inputs — only visible when custom period is active
    this.customDateFrom = page.locator('input[type="date"]').first();
    this.customDateTo = page.locator('input[type="date"]').last();

    // Actions
    this.generateReportButton = page.getByRole('button', { name: /generate report/i });
    // Export dropdown trigger — rendered via DropdownMenu
    this.exportDropdown = page.getByRole('button', { name: /export/i });

    // Breakdown sections — identified by heading text
    this.revenueByClass = page.getByText(/by class/i).first().locator('..');
    this.revenueByMethod = page.getByText(/by payment method/i).first().locator('..');
    this.revenueByStatus = page.getByText(/by status/i).first().locator('..');
    this.expenseByCategory = page.getByText(/by category/i).first().locator('..');

    // Quick nav links
    this.studentPaymentsLink = page.getByRole('link', { name: /student payments/i });
    this.tutorPayoutsLink = page.getByRole('link', { name: /tutor payouts/i });
    this.operatingExpensesLink = page.getByRole('link', { name: /operating expenses/i });

    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/finance');
  }

  /* ── Period selection ── */

  async selectPeriod(period: 'This Month' | 'This Quarter' | 'Year to Date' | 'Custom' | string) {
    await this.page.getByRole('button', { name: new RegExp(period, 'i') }).click();
  }

  /* ── Custom date range ── */

  async setCustomDateRange(from: string, to: string) {
    // First activate the custom tab
    await this.customTab.click();
    await this.customDateFrom.fill(from);
    await this.customDateTo.fill(to);
  }

  /* ── Stat card helper ── */

  getStatCard(label: string): Locator {
    return this.page.getByText(new RegExp(label, 'i')).first();
  }

  /**
   * Returns the value text content from a stat card by matching the label text.
   */
  async getStatCardValue(label: string): Promise<string> {
    const card = this.page.getByText(new RegExp(label, 'i')).first().locator('..');
    const valueEl = card.locator('p.font-bold').first();
    return (await valueEl.textContent()) ?? '';
  }

  /**
   * Returns 'positive' or 'negative' based on the net profit container CSS classes.
   * The component uses emerald for positive and red for negative.
   */
  async getNetProfitTheme(): Promise<'positive' | 'negative'> {
    const container = this.page.locator('.p-5.rounded-2xl.border').last();
    const classes = (await container.getAttribute('class')) ?? '';
    if (classes.includes('emerald')) return 'positive';
    return 'negative';
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

  /* ── Export CSV ── */

  async exportCsv(type: 'payments' | 'payouts' | 'expenses') {
    // Open the export dropdown
    await this.exportDropdown.click();

    // Select the export type from dropdown items
    const labelMap: Record<string, RegExp> = {
      payments: /export.*payment/i,
      payouts: /export.*payout/i,
      expenses: /export.*expense/i,
    };

    await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/admin/reports') &&
          resp.url().includes('export') &&
          resp.url().includes(type),
      ),
      this.page.getByText(labelMap[type]).click(),
    ]);
  }

  getToast(): Locator {
    return this.toast;
  }
}
