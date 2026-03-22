import { type Page, type Locator } from '@playwright/test';
import { confirmChangesModal } from '../helpers/confirm-changes-modal';

export class SettingsPage {
  /* ── Tab buttons ── */
  readonly generalTab: Locator;
  readonly billingTab: Locator;
  readonly academicTab: Locator;
  readonly registrationTab: Locator;
  readonly plansTab: Locator;
  readonly securityTab: Locator;

  /* ── General form ── */
  readonly institutionNameInput: Locator;
  readonly supportEmailInput: Locator;
  readonly saveChangesButton: Locator;

  /* ── Toast ── */
  readonly toast: Locator;

  constructor(private page: Page) {
    this.generalTab = page.getByRole('button', { name: /general/i });
    this.billingTab = page.getByRole('button', { name: /billing/i });
    this.academicTab = page.getByRole('button', { name: /academic/i });
    this.registrationTab = page.getByRole('button', { name: /registration/i });
    this.plansTab = page.getByRole('button', { name: /plans/i });
    this.securityTab = page.getByRole('button', { name: /security/i });

    // General form labels don't have htmlFor, so use label text -> parent -> input
    this.institutionNameInput = page.locator('label').filter({ hasText: /institution name/i }).locator('..').locator('input').first();
    this.supportEmailInput = page.locator('label').filter({ hasText: /support email/i }).locator('..').locator('input').first();
    this.saveChangesButton = page.getByRole('button', { name: /save changes/i });

    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/settings');
  }

  /* ── Tab navigation ── */

  async switchTab(tabName: 'General' | 'Billing' | 'Academic' | 'Registration' | 'Plans' | 'Security' | string) {
    await this.page.getByRole('button', { name: new RegExp(tabName, 'i') }).click();
  }

  /* ── General tab ── */

  async updateGeneral(data: { name?: string; email?: string }) {
    if (data.name) {
      await this.institutionNameInput.clear();
      await this.institutionNameInput.fill(data.name);
    }
    if (data.email) {
      await this.supportEmailInput.clear();
      await this.supportEmailInput.fill(data.email);
    }
    await this.saveChangesButton.click();
    await confirmChangesModal(this.page);
  }

  /* ── Security tab ── */

  /**
   * Fill the change password form and submit.
   * The security form uses plain <label> + sibling <div><input></div> without htmlFor,
   * so we locate inputs by finding the label text then navigating to the sibling input.
   */
  async changePassword(data: { current: string; newPassword: string; confirm: string }) {
    await this.switchTab('Security');
    // Wait for security form to be visible
    await this.page.getByText(/current password/i).waitFor({ state: 'visible' });

    // The form has 3 password inputs in order: current, new, confirm
    const inputs = this.page.locator('form input[type="password"], form input[type="text"]').filter({
      has: this.page.locator('xpath=ancestor::form'),
    });
    // Use label-based navigation: find label, go to parent div, find input
    const currentInput = this.page.locator('label').filter({ hasText: /current password/i }).locator('..').locator('input').first();
    const newInput = this.page.locator('label').filter({ hasText: /^new password$/i }).locator('..').locator('input').first();
    const confirmInput = this.page.locator('label').filter({ hasText: /confirm new password/i }).locator('..').locator('input').first();

    await currentInput.fill(data.current);
    await newInput.fill(data.newPassword);
    await confirmInput.fill(data.confirm);

    // Click "Update Password" submit button
    await this.page.getByRole('button', { name: /update password/i }).click();
  }

  getToast(): Locator {
    return this.toast;
  }
}
