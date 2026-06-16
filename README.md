# BookingApp

Studio booking, inventory, and finance — a full **Next.js + Neon** stack, free tier end to end.
Staff-operated (admin + staff); client self-booking is planned. Built phase by phase.

## Stack

| Layer        | Choice                                              |
| ------------ | --------------------------------------------------- |
| Framework    | Next.js 16 (App Router, RSC), TypeScript strict     |
| Styling      | Tailwind CSS 4 (dark-first, WCAG 2.2 AA floor)      |
| Database     | Neon serverless Postgres                            |
| ORM          | Drizzle ORM + Drizzle Kit migrations                |
| Auth         | Auth.js (NextAuth v5) — `admin` / `staff` roles     |
| Lint/format  | Biome                                               |
| Tests        | Vitest (unit) · Playwright (e2e)                    |
| Host / CI    | Vercel · GitHub Actions                             |

## Prerequisites

- Node.js 22+
- A free [Neon](https://neon.tech) Postgres database (pooled connection string)

## Setup

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env
#   - DATABASE_URL  → Neon pooled connection string
#   - AUTH_SECRET   → run: npx auth secret   (or: openssl rand -base64 32)

# 3. Apply the schema to your database
npm run db:migrate

# 4. Run
npm run dev          # http://localhost:3000
```

Verify the database round-trips: open <http://localhost:3000/api/health> — expect `{ "status": "ok", "db": "up" }`.

## Scripts

| Script                | Does                                          |
| --------------------- | --------------------------------------------- |
| `npm run dev`         | Dev server                                    |
| `npm run build`       | Production build                              |
| `npm run lint`        | Biome lint + format check                     |
| `npm run lint:fix`    | Biome autofix                                 |
| `npm run typecheck`   | `tsc --noEmit`                                |
| `npm run test`        | Vitest unit tests                             |
| `npm run test:e2e`    | Playwright e2e (builds + starts the app)      |
| `npm run db:generate` | Generate a migration from schema changes      |
| `npm run db:migrate`  | Apply pending migrations                       |
| `npm run db:studio`   | Drizzle Studio (browse data)                   |

## Structure

```
src/
├── app/
│   ├── api/health/route.ts   # liveness + DB round-trip
│   ├── layout.tsx · page.tsx · globals.css
├── db/
│   ├── schema.ts             # full forward-compatible schema (all phases)
│   └── index.ts              # Drizzle client (Neon HTTP)
├── lib/
│   ├── pricing.ts            # booking total + payment status (pure, tested)
│   └── activity-log.ts       # audit helper (used from Phase 1)
├── auth.config.ts            # edge-safe Auth.js config (middleware)
├── auth.ts                   # Auth.js instance (Node runtime)
├── middleware.ts             # gates /admin
├── env.ts                    # typed env (Zod)
└── types/next-auth.d.ts      # role on session/JWT
drizzle/                      # generated SQL migrations
e2e/                          # Playwright specs
docs/                         # PROJECT_PLAN.md · ROADMAP.md
```

## Roadmap

- **Phase 0 — Environment & stack** ✅ scaffold, schema, auth wiring, health check, CI
- **Phase 1 — Auth** (admin + staff, activity-log foundation) ← next
- **Phase 2** Inventory + stock ledger
- **Phase 3** Packages & add-ons
- **Phase 4** Booking + add-ons + usage + audit
- **Phase 5** Dashboard
- **Phase 6** Payments (dynamic methods)
- **Phase 7** Expenses
- **Later** Client login

Full detail in [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Deploy

Push to GitHub and import on Vercel. Set `DATABASE_URL` and `AUTH_SECRET` as project env vars.
Run migrations against the production database with `npm run db:migrate` (or wire it into the deploy pipeline).
