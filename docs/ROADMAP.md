# BookingApp — Roadmap (Next.js + Neon)

**Domain:** Services / appointments (photo-studio style — packages + add-ons), staff-operated
**Architecture:** Full Next.js, free-tier end to end
**Users:** owner/admin + staff (no client login yet)

> **Current focus:** Phase 0 (environment) + Phase 1 (admin + staff auth).
> **Financial phases (6–7):** dynamic payment methods, booking payment, expenses.
> **Deferred:** client login — schema is built forward-compatible.

## At a glance

| Phase | Delivers | Group |
|-------|----------|-------|
| 0 | Next.js + Neon + Drizzle + Auth.js scaffold, schema migration, CI | **Now** |
| 1 | Admin + staff auth, activity-log foundation | **Now** |
| 2 | Inventory + stock ledger | Core |
| 3 | Packages & Add-ons catalogs | Core |
| 4 | Booking — required package + add-ons + usage, status, audit | Core |
| 5 | Dashboard — summary, today's availability + bookings, activity log | Core |
| 6 | Payments — dynamic methods, paid/unpaid/partial, revenue by method | Financial |
| 7 | Expenses — salary + supply (auto-restock), cash flow | Financial |
| — | Client login | Later |

## Decisions locked

- **Booking requires one package** (`package_id` not null)
- **Add-ons** — dynamic, admin-managed priced extras (e.g. extra print, 5R frame); a booking can have several
- **Booking total** = package price + add-ons; **payment status** = paid / unpaid / partial (with amount paid)
- **Supply expenses always restock** their linked inventory item
- **Audit** = full activity log (bookings, inventory, finance, users, settings) + inventory stock ledger
- **Expenses** are admin/owner-only (staff excluded)

## Stack (all free tier)

- **Framework** — Next.js 15 (App Router), TypeScript strict, RSC-first
- **Styling** — Tailwind CSS 4 (WCAG 2.2 AA floor)
- **Database** — Neon serverless Postgres
- **ORM / migrations** — Drizzle + Drizzle Kit
- **Auth** — Auth.js (NextAuth v5) + Drizzle adapter — `admin` / `staff` now; `client` later
- **Email** — Resend · **Jobs** — Vercel Cron · **Host/CI** — Vercel + GitHub Actions
- **Accounts** — Vercel, Neon, Resend (no card to start)

## Data model (Postgres / Drizzle)

- **users** — role: `admin` (owner) / `staff` (enum extendable to `client` later)
- **clients** — id, name, phone, email?, notes, **user_id?** *(nullable — attaches auth later)*
- **inventory_items** — id, name, price, description, **quantity**, reorder_level
- **packages** — id, name, price, duration_min, details, active
- **addons** — id, name, price, active  *(admin CRUD — dynamic dropdown of priced extras)*
- **bookings** — id, client_id, **package_id (required)**, starts_at, ends_at, **status**, **amount_total**, **amount_paid**, **payment_status** (paid/unpaid/partial), payment_mode_id?, notes, created_by, created_at
- **booking_addons** — booking_id, addon_id, qty, unit_price  *(sold extras → add to total)*
- **booking_items** — booking_id, item_id, qty  *(inventory consumed → usage + audit)*
- **payment_modes** — id, name, active  *(admin CRUD — the dynamic payment dropdown)*
- **expense_types** — id, name, **is_inventory_purchase**, active  *(admin CRUD — Salary, Supplies, Utilities…)*
- **expenses** — id, expense_type_id, amount, payment_mode_id, spent_on, description, **inventory_item_id?**, **qty?**, recorded_by, created_at
- **stock_ledger** — id, item_id, delta, type (usage / restock / adjustment / wastage), booking_id?, expense_id?, staff_id, created_at
- **activity_log** *(full audit)* — id, actor_id, action, entity_type, entity_id, summary (jsonb), created_at

- **status** enum — `pending → confirmed → completed / cancelled / no_show` (server-side transitions)
- **double-booking guard** — `btree_gist` exclusion constraint on (staff or resource, time range)
- **add-ons vs items** — `booking_addons` are priced extras the client pays for (revenue); `booking_items` are inventory consumed (cost/usage). An add-on may later link to an item for auto-deduction (option, not now).

## Phase 0 — Environment & stack

- **Goal** — app deploys, DB connected, auth wired, CI green
- `create-next-app` (TS, Tailwind 4, Biome); Neon + Drizzle schema + first migration (pooled connection)
- Auth.js config; Vitest + Playwright; GitHub Actions; Vercel linked
- **Exit** — preview deploys, migration applies, `/api/health` round-trips the DB

## Phase 1 — Auth (admin + staff) ← current focus

- **Goal** — secure login, two roles, audit foundation
- Role enum (`admin` / `staff`); password hashing (argon2); Auth.js Credentials; httpOnly session carries id + role
- Middleware gates `/admin/**`; per-action server checks; seed owner/admin; staff invite/disable
- **Activity log** — create `activity_log` + a logging helper (actor from session) that later phases call on every mutation
- **Forward-compat** — `users.role` extendable to `client`, `clients.user_id` nullable
- **Exit** — both roles land on permitted routes; bad sessions rejected; logins recorded in the activity log

## Phase 2 — Inventory (+ stock ledger)

- **Goal** — stock items with quantity and a ledger
- Fields — name, price, description, quantity, reorder_level
- `stock_ledger` — append-only; every change logs delta, type, who, when
- CRUD; low-stock flag; views — current stock, history, low-stock list
- **Exit** — adjusting stock writes a ledger row; quantity always derivable from the ledger

## Phase 3 — Packages & Add-ons

- **Goal** — two admin catalogs that feed bookings
- **packages** — name, price, duration, details, active
- **addons** — name, price, active (the dynamic dropdown: extra print, 5R frame, …)
- CRUD for both (admin)
- **Exit** — packages and add-ons created, edited, and selectable in a booking

## Phase 4 — Booking (+ add-ons + usage + audit)

- **Goal** — staff create bookings that price out and consume inventory
- Client (pick/create), time/date, **required package** (sets duration + base price)
- **Add-ons** — select many priced extras → `amount_total` = package + Σ(add-ons)
- **Usage/items** — many inventory items with qty → deduct stock + write `stock_ledger` rows
- **Status** — backend enum with transitions; notes
- Concurrency — exclusion constraint rejects overlaps; typed conflict error
- Every action writes to `activity_log`
- **Exit** — booking saves with package + add-ons + items; total computes; stock drops; one wins on a slot race
- *Payment status + method come in Phase 6*

## Phase 5 — Dashboard

- **Goal** — daily operating view + audit access
- **Summary** — today's bookings, low-stock alerts *(financial totals join in 6–7)*
- **Available time for the day** — open slots from working hours − bookings − buffers
- **Bookings for the day** — today's list with status + client + total
- **Activity log view** (admin) — searchable who-did-what
- Role-scoped: admin sees totals + audit; staff sees own day
- **Exit** — dashboard loads summary, availability, today's bookings, and (admin) the activity log

## Phase 6 — Payments (dynamic methods)

- **Goal** — record how a booking was paid; manage methods without code
- **payment_modes** — admin CRUD: add / rename / disable any method (GCash, cash, bank transfer, …); dropdown reads it live
- bookings gain `payment_mode_id`, `amount_paid`, `payment_status` (paid / unpaid / partial)
- Dashboard — revenue by method
- **Exit** — add a method in settings → it appears in the booking dropdown; booking records method + amount + status

## Phase 7 — Expenses (admin only)

- **Goal** — track money out, restocking on supply buys
- **expense_types** — admin CRUD; `is_inventory_purchase` flag
- **expenses** — type, amount, payment method, date, description, recorded_by
- **Supply purchases always restock** — an inventory-purchase expense requires item + qty and writes a `stock_ledger` restock row
- Examples — staff salary (non-inventory); Shopee supply (restocks)
- Admin/owner-only; not visible to staff
- Dashboard — today's expenses + income-vs-expense (cash flow)
- **Exit** — log a supply expense → money recorded and stock rises in one action; salary logs without touching stock

## Later (deferred)

- **Client login** — add `client` role; attach auth to existing `clients` records; client self-booking

## Cross-cutting (every phase)

- **Audit** — every Server Action writes an `activity_log` entry (actor, action, entity, summary)
- **Mutations** — Server Actions + Zod; throw for unrecoverable, typed Result for expected failures
- **Testing** — Vitest (availability, totals, stock deduction, ledger, cash) + Playwright (login → book → add-ons → deduct → pay)
- **Accessibility** — WCAG 2.2 AA on operated screens
- **DB ops** — Drizzle migrations in CI; Neon branch per Vercel preview

## Sequencing

- 0 → 1 (current focus) unblock everything; activity log starts in Phase 1
- Inventory (2) before Booking (4) — booking consumes items
- Packages & Add-ons (3) before Booking (4) — booking requires a package and lists add-ons
- Dashboard (5) reads the core; financial widgets fill in at 6–7
- Payments (6) → Expenses (7) share the dynamic `payment_modes` table
- Client login (later) layers on without reworking the schema

## Top risks

- **Double-booking** — Postgres exclusion constraint, not UI checks
- **Stock accuracy** — derive quantity from the ledger; supply expenses and usage both flow through it
- **Activity-log volume** — index by entity + date; keep `summary` compact (jsonb), not full row copies
- **Neon cold start** — resumes on query (sub-second); use the pooled connection string
- **Cron** — Vercel free-tier frequency capped `[unverified — confirm current limit]`

## Action item

- Update the **BookingApp** project settings — saved instruction still says "headless wp app"; switch to full Next.js.
