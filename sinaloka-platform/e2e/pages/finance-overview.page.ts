import { type Locator, type Page } from '@playwright/test';

export class FinanceOverviewPage {
  readonly generateReportButton: Locator;
  readonly exportButton: Locator;
  readonly reportModal: Locator;
  readonly statsGrid: Locator;

  constructor(private page: Page) {
    this.generateReportButton = page.getByRole('button', { name: /generate report/i });
    this.exportButton = page.getByRole('button', { name: /export/i });
    this.reportModal = page.locator('[role="dialog"]');
    this.statsGrid = page.locator('.grid').first();
  }

  async goto() { await this.page.goto('/finance'); }

  async openReport() {
    await this.generateReportButton.click();
    await this.reportModal.waitFor({ state: 'visible' });
  }

  async navigateToModule(module: 'Student Payments' | 'Tutor Payouts' | 'Operating Expenses') {
    // Link appears in both nav sidebar and main content; target the main content one
    await this.page.getByRole('main').getByRole('link', { name: module }).click();
  }

  async selectDateRange(range: 'This Month' | 'This Quarter' | 'Year to Date') {
    await this.page.getByRole('button', { name: range }).click();
  }

  getStatCard(label: string): Locator {
    return this.page.getByText(label).locator('..').locator('..');
  }

  getModuleLink(module: string): Locator {
    return this.page.getByRole('link', { name: module });
  }

  getToast(): Locator { return this.page.locator('[data-sonner-toaster]'); }
}
