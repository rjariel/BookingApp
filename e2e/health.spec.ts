import { expect, test } from '@playwright/test';

test('GET /api/health returns a status payload', async ({ request }) => {
  const res = await request.get('/api/health');
  // 200 when a DB is reachable; 503 with the placeholder CI env — both valid.
  expect([200, 503]).toContain(res.status());

  const body = await res.json();
  expect(body).toHaveProperty('status');
  expect(body).toHaveProperty('checkedAt');
});
