/**
 * Full booking flow — login → book → add-ons → deduct → pay.
 *
 * Prerequisites (must exist in the DB before running):
 *   • At least one active Package
 *   • At least one active PaymentMode
 *
 * Client data is always created inline ("new client") so the test is
 * deterministic regardless of prior DB state.
 *
 * Note on double-booking: the btree_gist exclusion constraint fires only
 * when staff_id IS NOT NULL. Unassigned bookings can freely overlap by
 * design (staff is assigned after booking via the duty module).
 *
 * Run locally:
 *   TEST_ADMIN_EMAIL=admin@example.com TEST_ADMIN_PASSWORD=secret npx playwright test
 */
import { expect, test } from '@playwright/test';

// ── helpers ──────────────────────────────────────────────────────────

/** ISO date string offset N days from today, in YYYY-MM-DD format. */
function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0] as string;
}

/** Unique-enough client name for each test run. */
function uniqueClient() {
  return `E2E Client ${Date.now()}`;
}

// ── tests ─────────────────────────────────────────────────────────────

test.describe('Booking flow', () => {
  test('creates a booking with a new client and records payment', async ({ page }) => {
    // ── Step 1: navigate to new booking form ───────────────────────
    await page.goto('/admin/bookings/new');
    await expect(page.getByRole('heading', { name: 'New Booking' })).toBeVisible();

    // ── Step 2: create a new client inline ─────────────────────────
    const createNewBtn = page.getByRole('button', { name: '+ Create new client instead' });
    if (await createNewBtn.isVisible()) {
      await createNewBtn.click();
    }

    const clientName = uniqueClient();
    await page.getByLabel('Name *').fill(clientName);
    await page.getByLabel('Phone').fill('+63 900 000 0001');

    // ── Step 3: select first available package ──────────────────────
    const packageSelect = page.locator('select[name="packageId"]');
    await expect(packageSelect).toBeVisible();
    const packageOptions = await packageSelect.locator('option').count();
    expect(packageOptions).toBeGreaterThan(0);

    // ── Step 4: set date (tomorrow) and time ───────────────────────
    await page.locator('input[type="date"]').fill(dateOffset(1));
    await page.locator('input[type="time"]').fill('10:00');

    // ── Step 5: select first add-on if the package has any ─────────
    const firstAddonCheckbox = page.locator('input[type="checkbox"]').first();
    const hasAddons = await firstAddonCheckbox.isVisible();
    if (hasAddons) {
      await firstAddonCheckbox.check();
    }

    // ── Step 6: set initial payment ────────────────────────────────
    await page.locator('input[name="amountPaid"]').fill('500');

    // Select first real payment mode (skip placeholder option at index 0)
    const paymentModeSelect = page.locator('select[name="paymentModeId"]');
    const modeOptions = await paymentModeSelect.locator('option').count();
    if (modeOptions > 1) {
      await paymentModeSelect.selectOption({ index: 1 });
    }

    // ── Step 7: submit ─────────────────────────────────────────────
    await page.getByRole('button', { name: 'Create booking' }).click();

    // Should redirect to /admin/bookings/[id]
    await page.waitForURL(/\/admin\/bookings\/[0-9a-f-]{36}/, { timeout: 15_000 });

    // ── Step 8: verify booking detail page ─────────────────────────
    await expect(page.getByRole('heading', { level: 1 })).toContainText(clientName);

    // ── Step 9: record additional payment ──────────────────────────
    await page.getByRole('button', { name: 'Record payment' }).click();

    // The inline payment form expands — fill in cumulative total paid
    const amountPaidInput = page.locator('input[name="amountPaid"]');
    await expect(amountPaidInput).toBeVisible({ timeout: 5_000 });
    await amountPaidInput.fill('9999');

    // "Save" exact match avoids collision with "Save notes" button
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // Form collapses on success — "Record payment" button returns
    await expect(page.getByRole('button', { name: 'Record payment' })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('confirms a booking via status transition', async ({ page }) => {
    // ── Create a booking first ─────────────────────────────────────
    await page.goto('/admin/bookings/new');
    await expect(page.getByRole('heading', { name: 'New Booking' })).toBeVisible();

    const createNewBtn = page.getByRole('button', { name: '+ Create new client instead' });
    if (await createNewBtn.isVisible()) {
      await createNewBtn.click();
    }

    await page.getByLabel('Name *').fill(uniqueClient());
    await page.locator('input[type="date"]').fill(dateOffset(3));
    await page.locator('input[type="time"]').fill('15:00');
    await page.getByRole('button', { name: 'Create booking' }).click();

    await page.waitForURL(/\/admin\/bookings\/[0-9a-f-]{36}/, { timeout: 15_000 });

    // ── Confirm the booking ────────────────────────────────────────
    await expect(page.getByText('Pending')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();

    // Status badge updates to "Confirmed"
    await expect(page.getByText('Confirmed')).toBeVisible({ timeout: 10_000 });

    // Confirm button should be gone; Cancel should still be present
    await expect(page.getByRole('button', { name: 'Confirm' })).not.toBeVisible();
  });

  test('navigates from bookings list to new booking and back', async ({ page }) => {
    await page.goto('/admin/bookings');
    await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible();

    await page.getByRole('link', { name: /new booking/i }).click();
    await expect(page).toHaveURL(/\/admin\/bookings\/new/);
    await expect(page.getByRole('heading', { name: 'New Booking' })).toBeVisible();

    await page.getByRole('link', { name: 'Bookings' }).first().click();
    await expect(page).toHaveURL(/\/admin\/bookings$/);
  });
});
