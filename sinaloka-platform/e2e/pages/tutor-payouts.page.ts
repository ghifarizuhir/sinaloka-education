import { type Locator, type Page } from '@playwright/test';

export interface PayoutFormData {
  tutorName: string;
  amount: number;
  date: string;
  description?: string;
}

export class TutorPayoutsPage {
  readonly newPayoutButton: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;
  readonly tableRows: Locator;
  // The create payout modal is a custom fixed div, not role="dialog"
  readonly createModal: Locator;

  constructor(private page: Page) {
    this.newPayoutButton = page.getByRole('button', { name: /new payout/i });
    this.searchInput = page.getByPlaceholder(/search tutors/i);
    this.table = page.locator('table');
    this.tableRows = page.locator('table tbody tr');
    this.createModal = page.locator('.fixed.inset-0').filter({ hasText: /create payout/i });
  }

  async goto() { await this.page.goto('/finance/payouts'); }

  async createPayout(data: PayoutFormData) {
    await this.newPayoutButton.click();
    await this.page.getByRole('heading', { name: /create payout/i }).waitFor({ state: 'visible' });
    await this.page.getByLabel(/tutor/i).selectOption({ label: data.tutorName });
    await this.page.getByLabel(/amount/i).fill(String(data.amount));
    await this.page.getByLabel(/date/i).fill(data.date);
    if (data.description) await this.page.getByLabel(/description/i).fill(data.description);
    await this.page.getByRole('button', { name: /create payout/i }).click();
  }

  async deletePayout(tutorName: string) {
    this.page.on('dialog', (dialog) => dialog.accept());
    const row = this.getRowByTutorName(tutorName);
    // X icon button at the end of the row
    await row.locator('button').last().click();
  }

  async reconcilePayout(tutorName: string) {
    const row = this.getRowByTutorName(tutorName);
    await row.getByRole('button', { name: /reconcile/i }).click();
  }

  async confirmPayout() {
    await this.page.getByRole('button', { name: /confirm.*generate slip/i }).click();
  }

  async search(query: string) { await this.searchInput.fill(query); }

  getRowByTutorName(name: string): Locator { return this.tableRows.filter({ hasText: name }); }
  getToast(): Locator { return this.page.locator('[data-sonner-toaster]'); }
}
