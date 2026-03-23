import { type Page, type Locator } from '@playwright/test';

export class InstitutionsPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly addButton: Locator;
  readonly table: Locator;
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder(/search institutions/i);
    this.addButton = page.getByRole('link', { name: /add institution/i });
    this.table = page.getByRole('table');
    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/super/institutions');
    await this.table.waitFor({ state: 'visible', timeout: 10_000 });
  }

  getRowByName(name: string): Locator {
    return this.table.getByRole('row').filter({ hasText: name });
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(300);
  }

  async gotoCreateForm() {
    await this.addButton.click();
    await this.page.waitForURL(/\/super\/institutions\/new/);
  }

  async fillCreateForm(data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
  }) {
    await this.page.locator('#name').fill(data.name);
    if (data.email) await this.page.locator('#email').fill(data.email);
    if (data.phone) await this.page.locator('#phone').fill(data.phone);
    if (data.address) await this.page.locator('#address').fill(data.address);
    await this.page.locator('#adminName').fill(data.adminName);
    await this.page.locator('#adminEmail').fill(data.adminEmail);
    await this.page.locator('#adminPassword').fill(data.adminPassword);
  }

  async submitCreate() {
    await this.page.getByRole('button', { name: /add institution/i }).click();
  }

  async openDetail(institutionName: string) {
    await this.getRowByName(institutionName).getByRole('link', { name: /edit/i }).click();
    await this.page.waitForURL(/\/super\/institutions\/.+/);
  }

  // NOTE: InstitutionDetail tabs are plain <button> elements, not role="tab"
  async clickTab(tabName: 'General' | 'Billing & Payment' | 'Admins' | 'Overview' | 'Plan') {
    await this.page.getByRole('button', { name: new RegExp(tabName, 'i') }).click();
  }

  async overridePlan(plan: 'STARTER' | 'GROWTH' | 'BUSINESS') {
    await this.clickTab('Plan');
    await this.page.getByRole('combobox').selectOption(plan);
    await this.page.getByRole('button', { name: /save/i }).click();
  }

  async impersonate(institutionName: string) {
    await this.getRowByName(institutionName).getByRole('button', { name: /enter/i }).click();
    await this.page.waitForURL('/');
  }

  get impersonationBanner(): Locator {
    return this.page.locator('.bg-amber-500');
  }

  async exitImpersonation() {
    await this.impersonationBanner.getByRole('button').click();
    await this.page.waitForURL(/\/super\/institutions/);
  }

  getToast(): Locator {
    return this.toast;
  }
}
