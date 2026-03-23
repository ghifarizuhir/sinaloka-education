import { type Page, type Locator } from '@playwright/test';

export class SubscriptionsPage {
  readonly page: Page;
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/super/subscriptions');
    await this.page.getByRole('table').or(this.page.getByRole('heading')).first().waitFor({ state: 'visible', timeout: 10_000 });
  }

  async switchTab(tab: 'SUBSCRIPTIONS' | 'PENDING PAYMENTS' | 'PAYMENT HISTORY') {
    await this.page.getByRole('tab', { name: new RegExp(tab, 'i') }).click();
    await this.page.getByRole('table').or(this.page.getByRole('heading')).first().waitFor({ state: 'visible', timeout: 10_000 });
  }

  getTable(): Locator {
    return this.page.getByRole('table');
  }

  getRowByInstitution(name: string): Locator {
    return this.getTable().getByRole('row').filter({ hasText: name });
  }

  async openOverrideModal(institutionName: string) {
    await this.getRowByInstitution(institutionName).getByRole('button', { name: /override/i }).click();
    await this.page.getByRole('dialog').waitFor({ state: 'visible' });
  }

  async fillOverride(data: { plan?: string; expiryDate?: string; status?: string; notes: string }) {
    const dialog = this.page.getByRole('dialog');
    if (data.plan) await dialog.locator('select').first().selectOption(data.plan);
    if (data.expiryDate) await dialog.getByLabel(/expires/i).fill(data.expiryDate);
    if (data.status) await dialog.locator('select').nth(1).selectOption(data.status);
    await dialog.getByPlaceholder(/reason/i).fill(data.notes);
  }

  async submitOverride() {
    await this.page.getByRole('dialog').getByRole('button', { name: /override/i }).click();
  }

  async approvePayment(institutionName: string) {
    await this.getRowByInstitution(institutionName).getByRole('button', { name: /approve/i }).click();
  }

  async rejectPayment(institutionName: string) {
    await this.getRowByInstitution(institutionName).getByRole('button', { name: /reject/i }).click();
  }

  getToast(): Locator {
    return this.toast;
  }
}
