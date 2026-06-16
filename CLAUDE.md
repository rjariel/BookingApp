@AGENTS.md

# BookingApp — project guide

Full **Next.js + Neon** app (no WordPress). Staff-operated studio ops: booking, inventory,
packages/add-ons, finance. Free-tier stack. Built in phases — see `docs/ROADMAP.md`.

## Commands

- `npm run dev` · `npm run build`
- `npm run lint` (Biome) · `npm run typecheck` · `npm run test` · `npm run test:e2e`
- `npm run db:generate` (after editing `src/db/schema.ts`) · `npm run db:migrate` · `npm run db:studio`

## Conventions

- TypeScript strict, `noUncheckedIndexedAccess`. RSC-first; `'use client'` only when needed.
- **Money** = `numeric(10,2)`. **Time** = `timestamptz`, stored UTC.
- Mutations are Server Actions validated with Zod; every mutation calls `logActivity` (`src/lib/activity-log.ts`).
- Errors: throw for unrecoverable; return a typed Result for expected failures. No silent catches.
- Auth split: `auth.config.ts` is edge-safe (middleware); `auth.ts` holds the Credentials provider (Node).
- Double-booking is guarded by a Postgres `btree_gist` exclusion constraint (see `drizzle/`), not UI checks.
- Lint/format with Biome (single quotes, semicolons, 100 cols). Run `npm run lint:fix` before committing.

## Current state

Phase 0 complete: scaffold, full forward-compatible schema, auth wiring (sign-in inert until Phase 1),
`/api/health`, Vitest + Playwright, GitHub Actions CI. **Next: Phase 1 — admin/staff credential auth.**
