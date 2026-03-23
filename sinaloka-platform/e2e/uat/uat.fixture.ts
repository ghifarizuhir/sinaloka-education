import { test as base, type Page } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import {
  readState, patchState, type UatState,
  readTokenCache, writeTokenCache, type TokenEntry,
} from './state/uat-state';

export interface UatFixtures {
  uatPage: Page;
  loginAs: (email: string, password: string) => Promise<Page>;
  loggedInPage: (role: 'superAdmin' | 'admin') => Promise<Page>;
  getState: () => UatState;
  setState: (partial: Partial<UatState>) => void;
}

function isTokenValid(entry: TokenEntry): boolean {
  // JWT_EXPIRY is 15m (900s). Use 12min as safe margin.
  const MAX_AGE_MS = 12 * 60 * 1000;
  return Date.now() - entry.obtained_at < MAX_AGE_MS;
}

async function getTokens(email: string, password: string): Promise<TokenEntry> {
  const cache = readTokenCache();
  const cached = cache.get(email);
  if (cached && isTokenValid(cached)) {
    return cached;
  }

  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[uat] Login API failed for ${email}: ${res.status} ${body}`);
  }

  const data = await res.json();
  const entry: TokenEntry = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    obtained_at: Date.now(),
  };

  cache.set(email, entry);
  writeTokenCache(cache);
  return entry;
}

export const test = base.extend<UatFixtures>({
  // Set language to English for all tests
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      localStorage.setItem('sinaloka-lang', 'en');
    });
    await use(page);
  },

  uatPage: async ({ page }, use) => {
    await use(page);
  },

  // loginAs: real UI login (used only when testing the login flow itself)
  loginAs: async ({ page }, use) => {
    await use(async (email: string, password: string) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(email, password);
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
      return page;
    });
  },

  // loggedInPage: inject tokens via localStorage (bypasses UI login + rate limit)
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

      const tokens = await getTokens(email, password);

      // Inject tokens into localStorage before any navigation
      await page.addInitScript((t) => {
        localStorage.setItem('access_token', t.access_token);
        localStorage.setItem('refresh_token', t.refresh_token);
      }, { access_token: tokens.access_token, refresh_token: tokens.refresh_token });

      // Navigate — app reads tokens from localStorage
      await page.goto(role === 'superAdmin' ? '/super/institutions' : '/');
      await page.waitForLoadState('networkidle');

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
