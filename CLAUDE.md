@AGENTS.md

# BookingApp — project guide

Full **Next.js + Neon** app (no WordPress). Staff-operated studio ops: booking, inventory,
packages/add-ons, finance. Free-tier stack. Built in phases — see `docs/ROADMAP.md`.

## Commands

- `npm run dev` · `npm run build`
- `npm run lint` (Biome) · `npm run typecheck` · `npm run test` · `npm run test:e2e`
- `npm run db:generate` (after editing `src/db/schema.ts`) · `npm run db:migrate` · `npm run db:studio`
- `npm run create-admin <email> <name> <password>` — bootstrap first admin user

## Conventions

- TypeScript strict, `noUncheckedIndexedAccess`. RSC-first; `'use client'` only when needed.
- **Money** = `numeric(10,2)`. **Time** = `timestamptz`, stored UTC.
- Mutations are Server Actions validated with Zod; every mutation calls `logActivity` (`src/lib/activity-log.ts`).
- Errors: throw for unrecoverable; return a typed Result for expected failures. No silent catches.
- Auth split: `auth.config.ts` is edge-safe (middleware); `auth.ts` holds the Credentials provider (Node).
- Double-booking is guarded by a Postgres `btree_gist` exclusion constraint (see `drizzle/`), not UI checks.
- Lint/format with Biome (single quotes, semicolons, 100 cols). Run `npm run lint:fix` before committing.

## Current state

Phase 1 complete: sign-in flow (`/login`), forgot-password (`/forgot-password`), reset-password
(`/reset-password`). Argon2id hashing (`src/lib/password.ts`), Resend email (`src/lib/email.ts`,
gracefully degrades to console.log without `RESEND_API_KEY`), `password_reset_tokens` table,
`middleware.ts` protects `/admin/*`. Bootstrap admin with `npm run create-admin`.
**Next: Phase 2 — Inventory + stock ledger.**
