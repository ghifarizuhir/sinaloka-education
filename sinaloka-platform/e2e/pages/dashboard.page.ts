import { type Locator, type Page } from '@playwright/test';

export class DashboardPage {
  readonly statsGrid: Locator;
  readonly activitySection: Locator;
  readonly commandPaletteInput: Locator;
  readonly commandPaletteModal: Locator;

  constructor(private page: Page) {
    this.statsGrid = page.locator('.grid').first();
    this.activitySection = page.getByText('Recent Activity');
    this.commandPaletteInput = page.locator('input[placeholder*="Search for"]');
    this.commandPaletteModal = page.locator('.fixed.inset-0').filter({ has: this.commandPaletteInput });
  }

  async goto() { await this.page.goto('/'); }

  getStatCard(label: string): Locator { return this.page.getByText(label).locator('..'); }
  getActivityItem(text: string): Locator { return this.page.getByText(text); }
  getQuickLink(text: string): Locator { return this.page.getByRole('link', { name: text }); }

  async openCommandPalette() {
    await this.page.getByRole('button', { name: /quick actions/i }).click();
  }

  async searchCommandPalette(query: string) {
    await this.openCommandPalette();
    await this.commandPaletteInput.fill(query);
  }

  getToast(): Locator { return this.page.locator('[data-sonner-toaster]'); }
}
