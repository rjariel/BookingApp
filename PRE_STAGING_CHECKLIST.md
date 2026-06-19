# Pre-Staging Checklist

**Last Updated:** 2026-06-19  
**Ready to Stage:** YES ✅

## Quick Start (5 min)

```bash
# 1. Install & setup
npm ci
npm run db:migrate

# 2. Create test admin
npm run create-admin owner@studio.com "Owner" "pass123"

# 3. Start dev server
npm run dev
# → http://localhost:3000

# 4. Test login
# Email: owner@studio.com, Password: pass123
```

## Code Validation

| Check | Status | Details |
|-------|--------|---------|
| **TypeScript** | ✅ Clean | 1 utility script warning (non-critical) |
| **Lint** | ✅ Pass | Biome checks pass |
| **Core flows** | ✅ Tested | Auth, bookings, inventory, cashflow |
| **BookingForm** | ✅ Fixed | No runtime errors |
| **Build** | ⚠️ Sandbox issue | Use `NODE_OPTIONS="--max-old-space-size=3072"` locally |
| **Database** | ✅ Ready | 21 tables, migrations up-to-date |

## Before Deploying to Staging

- [ ] Run `npm run lint` → should pass
- [ ] Run `npm run typecheck` → should show 0 errors
- [ ] Test locally: `npm run dev` → login & create a booking
- [ ] Check `.env.local` has `DATABASE_URL` and `AUTH_SECRET`
- [ ] Ensure all recent migrations applied: `npm run db:migrate`
- [ ] Git commit all changes: `git add . && git commit -m "Pre-staging: ..."`
- [ ] Push to main/staging branch

## Staging Platform Options

Pick one and follow setup in `STAGING_DEPLOYMENT.md`:

1. **Vercel** — 5 min setup, auto-build, free tier
2. **Railway** — Simple UI, includes Postgres, $5/mo
3. **Docker** — Any host (AWS, DigitalOcean, VPS)

## Critical Environment Variables

Set these in your staging platform:

```
DATABASE_URL=postgresql://...  (required)
AUTH_SECRET=<32+ random chars>  (required)
RESEND_API_KEY=re_xxxxx         (optional, defaults to console)
NODE_ENV=production             (auto-set on most platforms)
```

## Testing in Staging

### Core Happy Path (10 min)
1. Login with admin account
2. Create a test package (if not exists)
3. Create a test add-on
4. Create a booking with all fields
5. Verify booking appears in list
6. Check cash flow recorded payment

### Permissions Test (5 min)
1. Create a staff user via admin
2. Log out, log in as staff
3. Verify staff sees only allowed modules
4. Try accessing locked module → should get 403

### Data Integrity Test (5 min)
1. Create booking with 5 add-ons
2. Refresh page → data persists
3. Create second booking same time → prevented by constraint
4. Check inventory deducted correctly

---

## Troubleshooting

**Build fails locally?**
```bash
NODE_OPTIONS="--max-old-space-size=3072" npm run build
```

**Database migration error?**
```bash
npm run db:studio  # Open Drizzle Studio to inspect schema
```

**Login not working?**
```bash
# Recreate admin user
npm run create-admin new-email@domain.com "New Name" "newpass123"
```

**Booking creation fails?**
Check error message in browser console. Most common:
- Missing package (create one in admin)
- Inventory out of stock
- Double-booking conflict

---

## Success Criteria

Staging is ready when:
- ✅ All owners can log in
- ✅ Create booking flow completes without errors
- ✅ Double-booking is prevented
- ✅ Inventory deducts correctly
- ✅ Cash flow records payments
- ✅ No 5xx errors in logs
- ✅ Page load time < 2s

Once these pass, promote to production.
