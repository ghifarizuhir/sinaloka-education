import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly toast: Locator;
  readonly logoutButton: Locator;
  readonly forgotPasswordToggle: Locator;
  readonly forgotInfoBox: Locator;

  constructor(private page: Page) {
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.errorMessage = page.locator('.bg-red-50, .dark\\:bg-red-900\\/20').locator('p');
    this.toast = page.locator('[data-sonner-toast]');
    this.logoutButton = page.getByRole('button', { name: /log out/i });
    // "Forgot password?" toggle button
    this.forgotPasswordToggle = page.getByRole('button', { name: /forgot password/i });
    // Info box that appears when forgot password is toggled (contains Info icon + text)
    this.forgotInfoBox = page.locator('.rounded-lg.bg-zinc-50, .dark\\:bg-zinc-800\\/50').filter({ has: page.locator('svg') });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/auth/login') && resp.request().method() === 'POST'
      ),
      this.submitButton.click(),
    ]);
  }

  getErrorMessage() {
    return this.errorMessage;
  }

  getToast() {
    return this.toast;
  }

  /**
   * Navigate to Settings > Security tab, fill all 3 password fields, and submit.
   * SecurityTab uses plain <label> + <input> without IDs, so we locate by label text.
   */
  async changePassword(current: string, newPw: string, confirm: string) {
    await this.page.goto('/settings');
    // Click the Security tab
    await this.page.getByRole('button', { name: /security/i }).click();

    // The SecurityTab has 3 password fields labeled by text in <label> elements
    // Each field is inside a <div> with <label> followed by <div class="relative"><input>
    const form = this.page.locator('form');
    const inputs = form.locator('input');

    // Fields are in order: current password, new password, confirm password
    await inputs.nth(0).fill(current);
    await inputs.nth(1).fill(newPw);
    await inputs.nth(2).fill(confirm);

    // Submit button is the last button in the form
    const submitBtn = form.locator('button[type="submit"]');
    await Promise.all([
      this.page.waitForResponse(resp =>
        resp.url().includes('/auth/change-password') && resp.request().method() === 'POST'
      ),
      submitBtn.click(),
    ]);
  }

  /**
   * Returns the locator for the password validation checklist container.
   * Visible only when newPassword has content. Contains items with checkmarks.
   */
  getPasswordValidationIndicators(): Locator {
    return this.page.locator('.rounded-lg.bg-zinc-50, .dark\\:bg-zinc-800\\/50').filter({
      hasText: /✓|✗/,
    });
  }

  /**
   * Toggles password visibility on the login page PasswordInput component.
   * The eye toggle button has aria-label "Show password" or "Hide password".
   */
  async togglePasswordVisibility() {
    const toggleBtn = this.page.locator('button[aria-label="Show password"], button[aria-label="Hide password"]');
    await toggleBtn.first().click();
  }
}
