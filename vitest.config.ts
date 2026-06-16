import { defineConfig } from 'vitest/config';

/**
 * Unit tests run in a Node environment.
 * Pure domain logic (pricing, availability, ledger math) lives in `src/lib`
 * and is tested via co-located `*.test.ts` files.
 * End-to-end browser tests are handled separately by Playwright (see e2e/).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
    globals: false,
  },
});
