/**
 * Login page — auth boundary tests.
 * These run WITHOUT a stored session (no storageState dependency).
 * They are placed in a separate file so the chromium project's
 * testIgnore: /auth\.setup\.ts/ doesn't also need to filter these.
 */
import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('redirects unauthenticated requests to /login', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login/);
});

test('shows error on wrong credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email or username').fill('nobody@example.com');
  await page.getByLabel('Password').fill('wrongpassword');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Use p[role="alert"] to avoid matching Next.js's route announcer div
  // which also has role="alert" but is always empty
  const alert = page.locator('p[role="alert"]');
  await expect(alert).toBeVisible({ timeout: 10_000 });
  await expect(alert).not.toBeEmpty();
});

test('shows error on empty submission', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // HTML5 required validation fires before the server action
  const loginInput = page.getByLabel('Email or username');
  await expect(loginInput).toBeFocused();
});
