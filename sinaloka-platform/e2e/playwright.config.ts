import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'light-mode', use: {} },
    {
      name: 'dark-mode',
      use: {
        // Dark mode fixture injects .dark class via addInitScript
        darkMode: true,
      } as any,
    },
  ],
});
