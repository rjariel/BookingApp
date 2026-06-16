import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit configuration.
 *
 * `db:generate` reads the schema and emits SQL into ./drizzle (no DB needed).
 * `db:migrate` / `db:push` / `db:studio` connect using DATABASE_URL.
 * Drizzle Kit auto-loads `.env` / `.env.local` from the project root.
 */
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
});
