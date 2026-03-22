import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  globalSetup: './scripts/global-setup.ts',
  globalTeardown: './scripts/global-teardown.ts',

  webServer: [
    {
      command: 'npx dotenv-cli -e .env.test -- bash -c "cd ../sinaloka-backend && npx nest start"',
      port: 5555,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'cd ../sinaloka-platform && VITE_API_URL=http://localhost:5555/api npx vite preview --port 3000',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
});
