# Changelog

## 2026-07-03 — Booking payment guard, bookings UX, PH-timezone fixes

### New features

- **Payment-complete guard.** A booking can no longer be marked "completed" while it still has
  a balance due. Enforced server-side in `updateBookingStatus` (authoritative) and mirrored in
  the UI — the "Mark completed" button is disabled with a tooltip and the server error is
  surfaced inline if bypassed.
- **App version in the footer.** The admin shell now shows `{studio name} · v{package.json
  version}` at the bottom of every admin page.
- **Month filter for Bookings.** The bookings list now filters by calendar month (`?month=`),
  defaulting to the current PH month, with a `<input type="month">` picker.
- **Clear-month tool (admin only).** Wipes every booking in a selected month, releases any
  inventory it had reserved back into stock, and logs the action — a test-data reset tool for
  staff test rounds, not for daily use. Requires confirmation before running.
- **Advance-booking indicators.** A "Advance Booking" pill now appears on any booking scheduled
  for a future PH calendar day (in both the bookings list and a new "Advance bookings" panel on
  the dashboard, showing the next 5 upcoming bookings beyond today).

### Fixes

- **Reports currency symbol.** Fixed the Reports page showing ₹ (Indian Rupee) instead of ₱
  (Philippine Peso) on Income, Expenses, Net Profit, and the trend chart tooltip.
- **Timezone correctness.** Cash Flow and Reports previously bucketed "today" and daily
  revenue using UTC dates; both now consistently use Philippine time (`Asia/Manila`), matching
  how `spentOn`/`date` columns are entered. New shared helpers in `src/lib/timezone.ts`
  (`phDateStr`, `phDayBounds`, `phMonthStr`, `phMonthBounds`, PH-locale formatters) replace
  several one-off, inconsistent date calculations across the dashboard, bookings, and cash flow
  pages.
- **Reports dark mode.** The Reports page previously rendered light-mode-only; it now respects
  the app's dark theme (cards, chart axes/gridlines/tooltip, buttons).
- **Form accessibility.** Added proper `<label htmlFor>` / `id` pairing across the new-employee
  and role forms so screen readers and label clicks work correctly.

### Internal

- Extracted `src/lib/booking-timing.ts` (`isAdvanceBooking`) and `src/lib/timezone.ts` as shared
  utilities, replacing duplicated timezone logic in dashboard/bookings/cash-flow pages.
- Minor consistency fixes across duty, employees, inventory, and packages admin screens.
