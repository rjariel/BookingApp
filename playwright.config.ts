import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

/**
 * E2E config. The `webServer` builds nothing itself — CI runs `next build`
 * first, then `next start`. Dummy env keeps the server bootable without real
 * secrets; the health check tolerates a DB-down (503) response in that case.
 *
 * Auth state is saved by the `setup` project (e2e/auth.setup.ts) and reused
 * by all feature tests. Set TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD in your
 * .env.local (or CI secrets) to match a seeded admin account.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // booking tests share DB state — run serially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // 1. Login once and persist the session cookie
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // 2. All feature tests reuse the saved session
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],

  webServer: {
    command: 'npm run start',
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      SKIP_ENV_VALIDATION: '1',
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/bookingapp',
      AUTH_SECRET: process.env.AUTH_SECRET ?? 'e2e-placeholder-secret',
    },
  },
});
