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

  /* ── Security form ── */
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly updatePasswordButton: Locator;

  /* ── Toast ── */
  readonly toast: Locator;

  constructor(private page: Page) {
    this.generalTab = page.getByRole('button', { name: /general/i });
    this.billingTab = page.getByRole('button', { name: /billing/i });
    this.academicTab = page.getByRole('button', { name: /academic/i });
    this.registrationTab = page.getByRole('button', { name: /registration/i });
    this.plansTab = page.getByRole('button', { name: /plans/i });
    this.securityTab = page.getByRole('button', { name: /security/i });

    this.institutionNameInput = page.getByLabel(/institution name/i);
    this.supportEmailInput = page.getByLabel(/support email/i);
    this.saveChangesButton = page.getByRole('button', { name: /save changes/i });

    this.currentPasswordInput = page.getByLabel(/current password/i);
    this.newPasswordInput = page.getByLabel(/^new password$/i);
    this.confirmPasswordInput = page.getByLabel(/confirm new password/i);
    this.updatePasswordButton = page.getByRole('button', { name: /update password/i });

    this.toast = page.locator('[data-sonner-toaster]');
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

  async changePassword(data: { current: string; newPassword: string; confirm: string }) {
    await this.switchTab('Security');
    await this.currentPasswordInput.fill(data.current);
    await this.newPasswordInput.fill(data.newPassword);
    await this.confirmPasswordInput.fill(data.confirm);
    await this.updatePasswordButton.click();
  }

  getToast(): Locator {
    return this.toast;
  }
}
