import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isUat = process.argv.includes('--project=uat') || process.env.UAT === '1';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  // globalSetup/globalTeardown must be top-level (not per-project).
  // Only activate for UAT runs to avoid resetting DB during normal E2E.
  globalSetup: isUat ? resolve(__dirname, './uat/global-setup.ts') : undefined,
  globalTeardown: isUat ? resolve(__dirname, './uat/global-teardown.ts') : undefined,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'uat',
      testDir: './uat/specs',
      fullyParallel: false,
      workers: 1,
      retries: 0,
      use: {
        baseURL: 'http://localhost:3000',
        storageState: undefined,
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        actionTimeout: 15_000,
        navigationTimeout: 30_000,
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
