import { defineConfig } from '@playwright/test';

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

/**
 * E2E config. The `webServer` builds nothing itself — CI runs `next build`
 * first, then `next start`. Dummy env keeps the server bootable without real
 * secrets; the health check tolerates a DB-down (503) response in that case.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run start',
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      SKIP_ENV_VALIDATION: '1',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/bookingapp',
      AUTH_SECRET: 'e2e-placeholder-secret',
    },
  },
});
