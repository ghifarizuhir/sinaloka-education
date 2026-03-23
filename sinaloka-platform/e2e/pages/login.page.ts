import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly toast: Locator;
  readonly logoutButton: Locator;

  constructor(private page: Page) {
    this.emailInput = page.getByLabel(/email address/i);
    this.passwordInput = page.locator('#password');
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.errorMessage = page.locator('.bg-red-50, .dark\\:bg-red-900\\/20').locator('p');
    this.toast = page.locator('[data-sonner-toast]');
    this.logoutButton = page.getByRole('button', { name: /log out/i });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  getErrorMessage() {
    return this.errorMessage;
  }

  getToast() {
    return this.toast;
  }
}
