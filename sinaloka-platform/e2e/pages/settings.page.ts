import { type Locator, type Page } from '@playwright/test';

export type SettingsTab = 'general' | 'billing' | 'branding' | 'academic' | 'security' | 'integrations';

export class SettingsPage {
  readonly saveButton: Locator;

  constructor(private page: Page) {
    this.saveButton = page.getByRole('button', { name: /save changes/i });
  }

  async goto() { await this.page.goto('/settings'); }

  async selectTab(tab: SettingsTab) {
    const tabLabels: Record<SettingsTab, string> = {
      general: 'General',
      billing: 'Billing',
      branding: 'Branding',
      academic: 'Academic',
      security: 'Security',
      integrations: 'Integrations',
    };
    await this.page.getByRole('button', { name: tabLabels[tab] }).click();
  }

  // --- General tab ---
  async updateInstitutionName(name: string) {
    await this.page.getByLabel(/institution name/i).fill(name);
    await this.saveButton.click();
  }

  async updateSupportEmail(email: string) {
    await this.page.getByLabel(/support email/i).fill(email);
    await this.saveButton.click();
  }

  // --- Billing tab ---
  async selectBillingMode(mode: 'pay-as-you-go' | 'package' | 'subscription') {
    const labels: Record<string, string> = {
      'pay-as-you-go': 'Pay-as-you-go',
      package: 'Package/Prepaid',
      subscription: 'Subscription',
    };
    await this.page.getByText(labels[mode]).click();
  }

  // --- Branding tab ---
  async updatePrimaryColor(color: string) {
    await this.page.getByPlaceholder('#000000').fill(color);
  }

  // --- Academic tab ---
  async addRoom() {
    await this.page.getByRole('button', { name: /add room/i }).click();
  }

  // --- Security tab ---
  async toggle2FA() {
    await this.page.getByText(/two-factor authentication/i).locator('..').locator('..').locator('button').click();
  }

  getTabButton(tab: string): Locator {
    return this.page.getByRole('button', { name: tab });
  }

  getActiveTab(): Locator {
    // The active tab has bg-zinc-900 class
    return this.page.locator('.bg-zinc-900.text-white');
  }

  getToast(): Locator { return this.page.locator('[data-sonner-toaster]'); }
}
