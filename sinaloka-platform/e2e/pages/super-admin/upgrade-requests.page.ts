import { type Page, type Locator } from '@playwright/test';

export class UpgradeRequestsPage {
  readonly page: Page;
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/super/upgrade-requests');
    await this.page.getByRole('table').or(this.page.getByRole('heading')).first().waitFor({ state: 'visible', timeout: 10_000 });
  }

  async switchTab(tab: 'All Statuses' | 'Pending' | 'Approved' | 'Rejected') {
    await this.page.getByRole('button', { name: new RegExp(`^${tab}$`, 'i') }).click();
    await this.page.waitForTimeout(500);
  }

  getTable(): Locator {
    return this.page.getByRole('table');
  }

  getRowByInstitution(name: string): Locator {
    return this.getTable().getByRole('row').filter({ hasText: name });
  }

  async openReviewModal(institutionName: string) {
    await this.getRowByInstitution(institutionName)
      .getByRole('button', { name: /approve|reject/i })
      .click();
    await this.page.getByRole('dialog').waitFor({ state: 'visible' });
  }

  async approve(notes?: string) {
    const dialog = this.page.getByRole('dialog');
    if (notes) await dialog.getByPlaceholder(/note/i).fill(notes);
    await dialog.getByRole('button', { name: /approve/i }).click();
  }

  async reject(notes: string) {
    const dialog = this.page.getByRole('dialog');
    await dialog.getByPlaceholder(/note/i).fill(notes);
    await dialog.getByRole('button', { name: /reject/i }).click();
  }

  getToast(): Locator {
    return this.toast;
  }
}
