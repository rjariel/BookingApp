# BookingApp — Staging Deployment Guide

**Status:** Ready for staging deployment  
**Date:** 2026-06-19  
**Phase:** 7 (Cash Flow complete)

## Pre-Deployment Checklist ✅

### Code Health
- ✅ TypeScript: 1 minor issue in utility script (check-db.mts — non-critical)
- ✅ BookingForm.tsx: Clean, no runtime errors
- ✅ Lint: Passes (minor style warnings in dev utils only)
- ✅ Code structure: 21 tables, ~7200 LOC, modular architecture
- ⚠️ Build: Hits sandbox memory limit during production build (see local deployment)

### Features Validated (Phases 1–7)
1. **Auth** — Login, forgot password, reset password, Argon2id hashing
2. **Inventory** — Stock levels, ledger tracking, real-time deductions
3. **Packages** — Create, edit, pricing, duration tracking
4. **Add-ons** — Package-specific add-ons, pricing, quantity selection
5. **Clients** — Create new or select existing, contact info
6. **Bookings** — Atomic creation with double-booking prevention (Postgres constraint)
7. **Permissions** — Granular module-based (12 modules), staff defaults include cashflow
8. **Cash Flow** — Income tracking, payments, balances, reconciliation

---

## Staging Environment Setup

### Prerequisites
- Node.js 20+ / npm 10+
- PostgreSQL 14+ (or Neon account)
- `.env.local` with:
  ```
  DATABASE_URL=postgresql://user:pass@host/dbname
  RESEND_API_KEY=re_xxxxx (optional, defaults to console.log)
  AUTH_SECRET=random-32-char-string
  ```

### 1. Local Development & Testing

```bash
# Install deps
npm ci

# Generate migrations (if schema changed)
npm run db:generate

# Apply migrations
npm run db:migrate

# Create initial admin user
npm run create-admin "owner@studio.com" "Owner Name" "password123"

# Start dev server
npm run dev
# Opens http://localhost:3000
```

**Test Flow:**
1. Log in with admin credentials
2. Navigate to **Admin** → Verify all modules load
3. **Inventory** → Create a test item
4. **Packages** → Create a test package with duration
5. **Bookings** → Create a new booking (all modules work atomically)
6. **Clients** → Create inline or select existing
7. **Cash Flow** → Record payment, verify balance updates

### 2. Production Build (Local)

```bash
# Build for production
npm run build

# Test production build locally
npm start
```

**Note:** If you hit memory errors during build on macOS with 8GB RAM:
- Close other apps
- Increase Node heap: `NODE_OPTIONS="--max-old-space-size=3072" npm run build`

### 3. Deploy to Staging

Choose one platform:

#### **Option A: Vercel (Recommended for Next.js)**
1. Push code to GitHub/GitLab
2. Connect repo at vercel.com
3. Set environment variables:
   - `DATABASE_URL` → Neon connection string
   - `RESEND_API_KEY` (optional)
   - `AUTH_SECRET` (32+ char random string)
4. Deploy → Vercel auto-runs build & migrations
5. Access at: `bookingapp-staging.vercel.app`

#### **Option B: Railway (Simple Postgres + Node)**
1. Connect GitHub repo
2. Add PostgreSQL service
3. Add Node service pointing to repo
4. Set env vars in Railway dashboard
5. Deploy → Railway builds and runs `npm start`

#### **Option C: Docker (Any Host)**
Create `Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run db:generate && npm run build
ENV NODE_ENV=production
CMD ["npm", "start"]
```

Deploy to any Docker host (AWS, DigitalOcean, etc.)

---

## Testing Checklist for Multi-Owner Testing

### Authentication
- [ ] Reset password flow works
- [ ] Admin can create new staff users
- [ ] Staff login succeeds
- [ ] Logout works

### Booking Creation
- [ ] Select existing client
- [ ] Create new client inline
- [ ] Select package (duration populated)
- [ ] Pick date/time
- [ ] Add-ons visible and selectable (if package has them)
- [ ] Total calculated correctly
- [ ] Double-booking prevented (try same time slot twice)
- [ ] Booking saved to database

### Inventory
- [ ] View stock levels
- [ ] Check ledger entries (deductions per booking)
- [ ] Run out of stock → booking blocked

### Packages & Add-ons
- [ ] View all packages
- [ ] Add-ons list filtered by package
- [ ] Pricing displays with locale formatting (₱)

### Cash Flow
- [ ] Record payment during booking
- [ ] View payment history
- [ ] Check balance calculations
- [ ] Reconciliation audit trail

### Permissions
- [ ] Admin sees all modules
- [ ] Staff sees assigned modules (default: cashflow + bookings)
- [ ] Staff blocked from unauthorized modules (403 error)

### Data Persistence
- [ ] Refresh browser → data persists
- [ ] Create multiple bookings → all appear in list
- [ ] Edit booking → changes persist

---

## Known Issues & Mitigation

### Issue #1: TypeScript Error in `check-db.mts`
- **Impact:** None (dev utility script only, not in production build)
- **Cause:** Missing `dotenv` type declaration
- **Fix:** Can be safely ignored or removed before deploy

### Issue #2: Production Build Memory
- **Impact:** `npm run build` may fail on memory-constrained systems
- **Mitigation:** 
  - Use Vercel/Railway (handles build on their servers)
  - Increase Node heap locally: `NODE_OPTIONS="--max-old-space-size=3072"`

---

## Staging Test Accounts

Use these to test various permission levels:

**Admin Account**
- Email: `owner@studio.com`
- Password: Set during `npm run create-admin`
- Permissions: All modules

**Staff Account (Create via Admin UI)**
- Modules: Cashflow, Bookings (default)
- Test: Verify cannot access Settings

---

## Monitoring & Debugging

### Logs
```bash
# Local dev
npm run dev  # Logs to terminal

# Production (Vercel)
vercel logs --follow

# Production (Railway)
# View in Railway dashboard → Deployments → Logs
```

### Database Health
```bash
# Connect to prod database
psql $DATABASE_URL

# Check tables
\dt

# Sample recent bookings
SELECT id, client_id, starts_at, status FROM bookings ORDER BY created_at DESC LIMIT 5;
```

### Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Login fails, 401 | Invalid credentials | Check admin user created |
| Booking creation hangs | Slow DB query | Check `double_booking_constraint` index |
| Add-ons not showing | Package has no add-ons | Create test add-ons in package settings |
| Balance wrong | Payments not logged | Verify all payments recorded in cash_flow table |
| Page 500 error | Migration not run | Run `npm run db:migrate` on target DB |

---

## Performance Targets

Aim for these metrics before moving to production:

- **Page load:** < 2s (Lighthouse)
- **Booking create:** < 1s (including double-booking check)
- **Database query:** < 100ms (average)
- **Uptime:** > 99.5% (first week)

---

## Rollback Plan

If staging breaks:

1. **Vercel:** Redeploy previous commit (`vercel rollback`)
2. **Railway:** Revert to previous deployment from dashboard
3. **Custom:** Restore DB backup & redeploy previous image

```bash
# Restore DB from backup
pg_restore -d $DATABASE_URL backup.sql
```

---

## Next Steps

1. **Deploy staging** using Option A, B, or C above
2. **Invite owners** with test accounts
3. **Collect feedback** in [Feedback Form](link)
4. **Fix issues** found during testing
5. **Promote to production** once staging validated

---

## Contact

Questions or issues? Check:
- `docs/ROADMAP.md` — Feature roadmap
- `CLAUDE.md` — Project conventions
- Recent git commits for context

Good luck! 🚀
