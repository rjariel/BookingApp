/**
 * Auth setup — runs once before all feature tests.
 * Logs in as the test admin and saves the session cookie to
 * e2e/.auth/user.json so every downstream test skips the login page.
 *
 * Required env vars (add to .env.local or CI secrets):
 *   TEST_ADMIN_EMAIL    — email or username of a seeded admin/staff account
 *   TEST_ADMIN_PASSWORD — that account's password
 */
import { expect, test as setup } from '@playwright/test';
import path from 'node:path';

const AUTH_FILE = path.join(__dirname, '.auth/user.json');

setup('authenticate as admin', async ({ page }) => {
  const email = process.env.TEST_ADMIN_EMAIL;
  const password = process.env.TEST_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be set.\n' +
        'Add them to .env.local or your CI secrets.',
    );
  }

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await page.getByLabel('Email or username').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Middleware redirects authenticated users to /admin
  await page.waitForURL('/admin', { timeout: 15_000 });

  await page.context().storageState({ path: AUTH_FILE });
});
