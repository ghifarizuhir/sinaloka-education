import { test as base, type Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { readState, patchState, type UatState } from './state/uat-state';

export interface UatFixtures {
  uatPage: Page;
  loginAs: (email: string, password: string) => Promise<Page>;
  loggedInPage: (role: 'superAdmin' | 'admin') => Promise<Page>;
  getState: () => UatState;
  setState: (partial: Partial<UatState>) => void;
}

export const test = base.extend<UatFixtures>({
  // CRITICAL: Set language to English so all i18n-based locators work consistently.
  // Without this, the UI may render in Indonesian and all English text locators will fail.
  uatPage: async ({ page }, use) => {
    await page.addInitScript(() => {
      localStorage.setItem('sinaloka-lang', 'en');
    });
    await use(page);
  },

  loginAs: async ({ page }, use) => {
    await use(async (email: string, password: string) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(email, password);
      // Wait for navigation away from login page
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
      return page;
    });
  },

  loggedInPage: async ({ page }, use) => {
    await use(async (role: 'superAdmin' | 'admin') => {
      const state = readState();
      let email: string;
      let password: string;

      if (role === 'superAdmin') {
        email = state.superAdmin.email;
        password = state.superAdmin.password;
      } else {
        if (!state.phase0?.adminCredentials) {
          throw new Error('[uat] phase0.adminCredentials missing. Run Phase 0 first.');
        }
        email = state.phase0.adminCredentials.email;
        password = state.phase1?.newAdminPassword ?? state.phase0.adminCredentials.password;
      }

      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(email, password);
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
      return page;
    });
  },

  getState: async ({}, use) => {
    await use(() => readState());
  },

  setState: async ({}, use) => {
    await use((partial: Partial<UatState>) => patchState(partial));
  },
});

export { expect } from '@playwright/test';
