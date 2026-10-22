import { and, desc, eq, gte, ilike, lt, ne, or, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { auth } from '@/auth';
import { db } from '@/db';
import {
  bookings,
  cashAdvances,
  cashIncome,
  cashReports,
  cashWithdrawals,
  expenses,
  paymentModes,
  users,
} from '@/db/schema';
import { requireModule } from '@/lib/permissions';
import { phDateStr, phDayBounds } from '@/lib/timezone';
import CashAdvanceForm from './_components/CashAdvanceForm';
import CashReportForm from './_components/CashReportForm';
import IncomeForm from './_components/IncomeForm';
import WithdrawalForm from './_components/WithdrawalForm';

export const metadata = { title: 'Cash Flow' };

const fmt = (v: string | number | null) =>
  `₱${parseFloat(String(v ?? 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

// Marks a figure as computed automatically from booking data, as opposed to
// manually entered/self-reported by staff — see the legend above each table.
function AutoIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`inline-block h-3 w-3 text-amber-500 dark:text-amber-400 ${className}`}
      aria-hidden="true"
    >
      <title>Automated</title>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

function varianceBadge(variance: number) {
  if (Math.abs(variance) < 0.01) {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
        ✓ match
      </span>
    );
  }
  const isOver = variance > 0;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        isOver
          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
          : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
      }`}
    >
      {isOver ? '+' : ''}
      {fmt(variance)}
    </span>
  );
}

export default async function CashFlowPage() {
  await requireModule('cashflow');
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const isAdmin = session.user.role === 'admin';
  const userId = session.user.id;

  // Today's date string (YYYY-MM-DD) in PH time — matches `spentOn`/`date` columns
  const today = phDateStr();

  if (isAdmin) {
    return <AdminView today={today} actorId={userId} />;
  }
  return (
    <StaffView
      today={today}
      staffId={userId}
      staffName={session.user.name ?? session.user.email ?? 'You'}
    />
  );
}

// ── Admin View ─────────────────────────────────────────────────────────
async function AdminView({ today }: { today: string; actorId: string }) {
  // 1. Studio totals: all manually logged cash in, all expenses out, all withdrawals out
  const [incomeRow] = await db
    .select({ total: sql<string>`coalesce(sum(amount), 0)` })
    .from(cashIncome);

  const [expenseRow] = await db
    .select({ total: sql<string>`coalesce(sum(amount), 0)` })
    .from(expenses);

  const [withdrawalRow] = await db
    .select({ total: sql<string>`coalesce(sum(amount), 0)` })
    .from(cashWithdrawals);

  const totalIn = parseFloat(incomeRow?.total ?? '0');
  const totalExpenses = parseFloat(expenseRow?.total ?? '0');
  const totalWithdrawn = parseFloat(withdrawalRow?.total ?? '0');
  const studioBalance = totalIn - totalExpenses - totalWithdrawn;

  // 2. Today's numbers
  const [todayIncomeRow] = await db
    .select({ total: sql<string>`coalesce(sum(amount), 0)` })
    .from(cashIncome)
    .where(eq(cashIncome.date, today));

  const [todayExpRow] = await db
    .select({ total: sql<string>`coalesce(sum(amount), 0)` })
    .from(expenses)
    .where(eq(expenses.spentOn, today));

  const todayIn = parseFloat(todayIncomeRow?.total ?? '0');
  const todayOut = parseFloat(todayExpRow?.total ?? '0');
  const todayNet = todayIn - todayOut;

  // 2b. Booking income for today — an independent, system-derived cross-check
  // against the manually-reported `todayIn` above. Covers bookings happening
  // today (any amount paid so far) plus advance bookings for a future date
  // whose deposit was taken today. `amountPaid` already combines the package
  // deposit and add-ons payment (see bookings/actions.ts), so it's summed
  // alone — adding `addonsAmountPaid` on top would double-count it.
  const { start: todayStart, end: todayEnd } = phDayBounds(new Date(`${today}T00:00:00+08:00`));
  const todaysBookingRows = await db
    .select({ amountPaid: bookings.amountPaid })
    .from(bookings)
    .where(
      and(
        sql`${bookings.status} IN ('completed','confirmed')`,
        or(
          and(gte(bookings.startsAt, todayStart), lt(bookings.startsAt, todayEnd)),
          and(gte(bookings.createdAt, todayStart), lt(bookings.createdAt, todayEnd)),
        ),
      ),
    );
  const todayBookingIncome = todaysBookingRows.reduce(
    (sum, r) => sum + parseFloat(r.amountPaid),
    0,
  );
  const bookingIncomeVariance = todayIn - todayBookingIncome;

  // 2c. Daily booking income, cash vs. total — last 60 days. Bucketed by the
  // date the payment was actually taken (`createdAt`, in PH time), not the
  // booking's event date — so an advance booking's deposit shows up on the
  // day it was paid, matching the "Expected" figures above. Known limit: a
  // booking's `amountPaid`/`addonsAmountPaid` are running totals, not a
  // payment-event ledger — if a balance is paid on a *different* day than
  // the deposit (e.g. cash on the shoot day), that later payment isn't
  // separately visible; it's folded into the original (deposit) day's total.
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86_400_000);

  const [cashModes, dailyBookingRows, dailyReportRows, dailyExpenseRows] = await Promise.all([
    db.select({ id: paymentModes.id }).from(paymentModes).where(ilike(paymentModes.name, 'cash')),
    db
      .select({
        amountPaid: bookings.amountPaid,
        addonsAmountPaid: bookings.addonsAmountPaid,
        paymentModeId: bookings.paymentModeId,
        addonsPaymentModeId: bookings.addonsPaymentModeId,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .where(
        and(
          sql`${bookings.status} IN ('completed','confirmed')`,
          gte(bookings.createdAt, sixtyDaysAgo),
        ),
      ),
    db
      .select({
        date: cashReports.date,
        staffName: users.name,
        notes: cashReports.notes,
        amountReported: cashReports.amountReported,
      })
      .from(cashReports)
      .innerJoin(users, eq(cashReports.staffId, users.id))
      .where(gte(cashReports.date, phDateStr(sixtyDaysAgo))),
    db
      .select({ date: expenses.spentOn, amount: expenses.amount })
      .from(expenses)
      .where(gte(expenses.spentOn, phDateStr(sixtyDaysAgo))),
  ]);

  const cashModeIds = new Set(cashModes.map((m) => m.id));

  const dailyTotals = new Map<string, { cash: number; total: number }>();
  for (const row of dailyBookingRows) {
    const date = phDateStr(row.createdAt);
    const addonsPaid = parseFloat(row.addonsAmountPaid);
    const packagePaid = parseFloat(row.amountPaid) - addonsPaid;
    const cashAmount =
      (row.paymentModeId && cashModeIds.has(row.paymentModeId) ? packagePaid : 0) +
      (row.addonsPaymentModeId && cashModeIds.has(row.addonsPaymentModeId) ? addonsPaid : 0);
    const totalAmount = packagePaid + addonsPaid;

    const entry = dailyTotals.get(date) ?? { cash: 0, total: 0 };
    entry.cash += cashAmount;
    entry.total += totalAmount;
    dailyTotals.set(date, entry);
  }

  const dailyNotes = new Map<string, string[]>();
  const dailyReported = new Map<string, number>();
  for (const row of dailyReportRows) {
    if (row.notes) {
      const list = dailyNotes.get(row.date) ?? [];
      list.push(`${row.staffName ?? 'Staff'}: ${row.notes}`);
      dailyNotes.set(row.date, list);
    }
    dailyReported.set(
      row.date,
      (dailyReported.get(row.date) ?? 0) + parseFloat(row.amountReported),
    );
  }

  const dailyExpenses = new Map<string, number>();
  for (const row of dailyExpenseRows) {
    dailyExpenses.set(row.date, (dailyExpenses.get(row.date) ?? 0) + parseFloat(row.amount));
  }

  // Union of dates with booking income, an EOD report, and/or expenses, so a
  // day with only one of those still gets a row.
  const allDates = new Set([
    ...dailyTotals.keys(),
    ...dailyReported.keys(),
    ...dailyExpenses.keys(),
  ]);

  const dailyBreakdown = Array.from(allDates)
    .map((date) => {
      const { cash, total } = dailyTotals.get(date) ?? { cash: 0, total: 0 };
      return {
        date,
        cash,
        total,
        expenses: dailyExpenses.get(date) ?? 0,
        reported: dailyReported.get(date) ?? null,
        notes: dailyNotes.get(date)?.join(' · ') ?? '',
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const dailyBreakdownTotals = dailyBreakdown.reduce(
    (acc, row) => ({
      cash: acc.cash + row.cash,
      total: acc.total + row.total,
      expenses: acc.expenses + row.expenses,
      reported: acc.reported + (row.reported ?? 0),
    }),
    { cash: 0, total: 0, expenses: 0, reported: 0 },
  );

  // 3. All staff EOD reports (last 90 days) with staff name
  const reports = await db
    .select({
      id: cashReports.id,
      date: cashReports.date,
      staffName: users.name,
      staffEmail: users.email,
      amountReported: cashReports.amountReported,
      notes: cashReports.notes,
      createdAt: cashReports.createdAt,
    })
    .from(cashReports)
    .innerJoin(users, eq(cashReports.staffId, users.id))
    .orderBy(desc(cashReports.date), desc(cashReports.createdAt))
    .limit(200);

  // 4. Manually logged income per date (to compute "expected" per EOD report)
  const dailyRevenue = await db
    .select({
      date: cashIncome.date,
      total: sql<string>`coalesce(sum(${cashIncome.amount}), 0)`,
    })
    .from(cashIncome)
    .groupBy(cashIncome.date);

  const revenueByDate = new Map(dailyRevenue.map((r) => [r.date, parseFloat(r.total)]));

  // 5. Withdrawals
  const withdrawals = await db
    .select({
      id: cashWithdrawals.id,
      date: cashWithdrawals.date,
      amount: cashWithdrawals.amount,
      reason: cashWithdrawals.reason,
      notes: cashWithdrawals.notes,
      withdrawnByName: users.name,
      withdrawnByEmail: users.email,
    })
    .from(cashWithdrawals)
    .leftJoin(users, eq(cashWithdrawals.withdrawnBy, users.id))
    .orderBy(desc(cashWithdrawals.date), desc(cashWithdrawals.createdAt))
    .limit(100);

  // 6. Income log
  const incomeEntries = await db
    .select({
      id: cashIncome.id,
      date: cashIncome.date,
      amount: cashIncome.amount,
      source: cashIncome.source,
      notes: cashIncome.notes,
      recordedByName: users.name,
      recordedByEmail: users.email,
    })
    .from(cashIncome)
    .leftJoin(users, eq(cashIncome.recordedBy, users.id))
    .orderBy(desc(cashIncome.date), desc(cashIncome.createdAt))
    .limit(100);

  // 7. Staff cash advances — all-time, for accurate outstanding balances
  const [activeStaff, advanceRows] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(and(eq(users.active, true), ne(users.role, 'client')))
      .orderBy(users.name),
    db
      .select({
        id: cashAdvances.id,
        date: cashAdvances.date,
        staffId: cashAdvances.staffId,
        staffName: users.name,
        staffEmail: users.email,
        type: cashAdvances.type,
        amount: cashAdvances.amount,
        reason: cashAdvances.reason,
        notes: cashAdvances.notes,
      })
      .from(cashAdvances)
      .innerJoin(users, eq(cashAdvances.staffId, users.id))
      .orderBy(desc(cashAdvances.date), desc(cashAdvances.createdAt)),
  ]);

  const advanceBalances = new Map<string, { name: string; advanced: number; repaid: number }>();
  for (const row of advanceRows) {
    const entry = advanceBalances.get(row.staffId) ?? {
      name: row.staffName ?? row.staffEmail ?? '—',
      advanced: 0,
      repaid: 0,
    };
    const amount = parseFloat(row.amount);
    if (row.type === 'advance') entry.advanced += amount;
    else entry.repaid += amount;
    advanceBalances.set(row.staffId, entry);
  }
  const advanceBalanceRows = Array.from(advanceBalances.values())
    .map((b) => ({ ...b, outstanding: b.advanced - b.repaid }))
    .sort((a, b) => b.outstanding - a.outstanding);

  return (
    <div className="px-4 py-8 space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Cash Flow</h1>
        <p className="mt-1 text-sm text-zinc-500">Studio cash overview — all staff, all time.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card label="Cash in studio" value={fmt(studioBalance)} highlight />
        <Card label="Total collected" value={fmt(totalIn)} />
        <Card label="Total expenses" value={`−${fmt(totalExpenses)}`} dim />
        <Card label="Total withdrawn" value={`−${fmt(totalWithdrawn)}`} dim />
      </div>

      {/* Today strip */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
          Today — {today}
        </p>
        <div className="flex flex-wrap gap-8">
          <Stat label="Collected (reported)" value={fmt(todayIn)} />
          <Stat
            label={
              <>
                <AutoIcon /> Booking income (auto)
              </>
            }
            value={fmt(todayBookingIncome)}
          />
          <Stat label="Expenses" value={fmt(todayOut)} />
          <Stat label="Net" value={fmt(todayNet)} bold />
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Booking income is computed automatically from today's bookings and advance bookings paid
          today (packages + add-ons) — an independent check against the manually reported total.{' '}
          {Math.abs(bookingIncomeVariance) < 0.01 ? (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              ✓ matches reported income
            </span>
          ) : (
            <>
              Differs by{' '}
              <span className="font-medium">
                {bookingIncomeVariance > 0 ? '' : '−'}
                {fmt(Math.abs(bookingIncomeVariance))}
              </span>{' '}
              from what was reported.
            </>
          )}
        </p>
      </div>

      {/* Daily booking income — cash vs. total, system-computed */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
          Daily booking income — cash vs. total
        </h2>
        <p className="mb-1 text-xs text-zinc-500">
          Bucketed by the date each payment was taken. Last 60 days. "Expenses" is that day's
          recorded expenses (from the Expenses module). "Reported EOD" is the sum of staff cash
          counts submitted for that date; notes are pulled from those same reports.
        </p>
        <p className="mb-3 flex items-center gap-1.5 text-xs text-zinc-500">
          <AutoIcon /> = calculated automatically from booking data, not typed in by staff.
        </p>
        {dailyBreakdown.length === 0 ? (
          <p className="text-sm text-zinc-400">No booking income in the last 60 days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 text-right font-medium">
                    <span className="inline-flex items-center gap-1">
                      <AutoIcon /> Paid in cash (studio)
                    </span>
                  </th>
                  <th className="pb-2 pr-4 text-right font-medium">
                    <span className="inline-flex items-center gap-1">
                      <AutoIcon /> Total for the day
                    </span>
                  </th>
                  <th className="pb-2 pr-4 text-right font-medium">Expenses</th>
                  <th className="pb-2 pr-4 text-right font-medium">Reported EOD</th>
                  <th className="pb-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {dailyBreakdown.map((row) => (
                  <tr key={row.date}>
                    <td className="py-3 pr-4 text-zinc-500 whitespace-nowrap">{row.date}</td>
                    <td className="py-3 pr-4 text-right font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      {fmt(row.cash)}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      {fmt(row.total)}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      {row.expenses > 0 ? `−${fmt(row.expenses)}` : fmt(0)}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      {row.reported !== null ? (
                        fmt(row.reported)
                      ) : (
                        <span className="text-zinc-400 text-xs font-normal">not submitted</span>
                      )}
                    </td>
                    <td className="py-3 text-zinc-400 text-xs max-w-[240px] truncate">
                      {row.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="py-3 pr-4 font-semibold text-zinc-900 dark:text-zinc-100">
                    Total ({dailyBreakdown.length} day{dailyBreakdown.length === 1 ? '' : 's'})
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {fmt(dailyBreakdownTotals.cash)}
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {fmt(dailyBreakdownTotals.total)}
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {dailyBreakdownTotals.expenses > 0
                      ? `−${fmt(dailyBreakdownTotals.expenses)}`
                      : fmt(0)}
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {fmt(dailyBreakdownTotals.reported)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Record income / withdrawal */}
      <div className="grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
            Record cash income
          </h2>
          <IncomeForm defaultDate={today} />
        </section>
        <section>
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
            Record cash withdrawal
          </h2>
          <WithdrawalForm defaultDate={today} />
        </section>
      </div>

      {/* Staff EOD reports */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
          Staff EOD reports
        </h2>
        {reports.length === 0 ? (
          <p className="text-sm text-zinc-400">No reports submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Staff</th>
                  <th className="pb-2 text-right font-medium">Expected</th>
                  <th className="pb-2 text-right font-medium">Reported</th>
                  <th className="pb-2 text-center font-medium">Variance</th>
                  <th className="pb-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {reports.map((r) => {
                  const expected = revenueByDate.get(r.date) ?? 0;
                  const reported = parseFloat(r.amountReported);
                  const variance = reported - expected;
                  return (
                    <tr key={r.id}>
                      <td className="py-3 pr-4 text-zinc-500 whitespace-nowrap">{r.date}</td>
                      <td className="py-3 pr-4 text-zinc-800 dark:text-zinc-200">
                        {r.staffName ?? r.staffEmail ?? '—'}
                      </td>
                      <td className="py-3 pr-4 text-right text-zinc-500 whitespace-nowrap">
                        {fmt(expected)}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                        {fmt(reported)}
                      </td>
                      <td className="py-3 pr-4 text-center">{varianceBadge(variance)}</td>
                      <td className="py-3 text-zinc-400 text-xs max-w-[200px] truncate">
                        {r.notes ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Income log */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">Income log</h2>
        {incomeEntries.length === 0 ? (
          <p className="text-sm text-zinc-400">No income recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Source</th>
                  <th className="pb-2 font-medium">By</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                  <th className="pb-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {incomeEntries.map((e) => (
                  <tr key={e.id}>
                    <td className="py-3 pr-4 text-zinc-500 whitespace-nowrap">{e.date}</td>
                    <td className="py-3 pr-4 text-zinc-800 dark:text-zinc-200">{e.source}</td>
                    <td className="py-3 pr-4 text-zinc-500">
                      {e.recordedByName ?? e.recordedByEmail ?? '—'}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      {fmt(e.amount)}
                    </td>
                    <td className="py-3 text-zinc-400 text-xs max-w-[160px] truncate">
                      {e.notes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Withdrawals log */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
          Withdrawal log
        </h2>
        {withdrawals.length === 0 ? (
          <p className="text-sm text-zinc-400">No withdrawals recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Reason</th>
                  <th className="pb-2 font-medium">By</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                  <th className="pb-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td className="py-3 pr-4 text-zinc-500 whitespace-nowrap">{w.date}</td>
                    <td className="py-3 pr-4 text-zinc-800 dark:text-zinc-200">{w.reason}</td>
                    <td className="py-3 pr-4 text-zinc-500">
                      {w.withdrawnByName ?? w.withdrawnByEmail ?? '—'}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      {fmt(w.amount)}
                    </td>
                    <td className="py-3 text-zinc-400 text-xs max-w-[160px] truncate">
                      {w.notes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Staff cash advances */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
          Staff cash advances
        </h2>
        <p className="mb-3 text-xs text-zinc-500">
          Loans given to staff and their repayments. Outstanding = advanced − repaid, all-time.
          Admin only for now.
        </p>

        {advanceBalanceRows.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                  <th className="pb-2 pr-4 font-medium">Staff</th>
                  <th className="pb-2 pr-4 text-right font-medium">Advanced</th>
                  <th className="pb-2 pr-4 text-right font-medium">Repaid</th>
                  <th className="pb-2 text-right font-medium">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {advanceBalanceRows.map((b) => (
                  <tr key={b.name}>
                    <td className="py-3 pr-4 text-zinc-800 dark:text-zinc-200">{b.name}</td>
                    <td className="py-3 pr-4 text-right text-zinc-500 whitespace-nowrap">
                      {fmt(b.advanced)}
                    </td>
                    <td className="py-3 pr-4 text-right text-zinc-500 whitespace-nowrap">
                      {fmt(b.repaid)}
                    </td>
                    <td
                      className={`py-3 text-right font-semibold whitespace-nowrap ${
                        b.outstanding > 0.01
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {fmt(b.outstanding)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mb-6 max-w-md">
          <CashAdvanceForm defaultDate={today} staffOptions={activeStaff} />
        </div>

        {advanceRows.length === 0 ? (
          <p className="text-sm text-zinc-400">No cash advances recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Staff</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 text-right font-medium">Amount</th>
                  <th className="pb-2 pr-4 font-medium">Reason</th>
                  <th className="pb-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {advanceRows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 pr-4 text-zinc-500 whitespace-nowrap">{row.date}</td>
                    <td className="py-3 pr-4 text-zinc-800 dark:text-zinc-200">
                      {row.staffName ?? row.staffEmail ?? '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.type === 'advance'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                        }`}
                      >
                        {row.type === 'advance' ? 'Advance' : 'Repayment'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      {fmt(row.amount)}
                    </td>
                    <td className="py-3 pr-4 text-zinc-500 text-xs max-w-[160px] truncate">
                      {row.reason ?? '—'}
                    </td>
                    <td className="py-3 text-zinc-400 text-xs max-w-[160px] truncate">
                      {row.notes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Staff View ─────────────────────────────────────────────────────────
async function StaffView({
  today,
  staffId,
  staffName,
}: {
  today: string;
  staffId: string;
  staffName: string;
}) {
  // Their EOD reports
  const reports = await db
    .select({
      id: cashReports.id,
      date: cashReports.date,
      amountReported: cashReports.amountReported,
      notes: cashReports.notes,
    })
    .from(cashReports)
    .where(eq(cashReports.staffId, staffId))
    .orderBy(desc(cashReports.date))
    .limit(60);

  // Their manually logged income, bucketed by day
  const dailyRevenue = await db
    .select({
      date: cashIncome.date,
      cashIn: sql<string>`coalesce(sum(${cashIncome.amount}), 0)`,
    })
    .from(cashIncome)
    .where(eq(cashIncome.recordedBy, staffId))
    .groupBy(cashIncome.date)
    .orderBy(desc(cashIncome.date))
    .limit(60);

  const revenueByDate = new Map(dailyRevenue.map((r) => [r.date, parseFloat(r.cashIn)]));

  // Today's existing report (if any)
  const todayReport = reports.find((r) => r.date === today);

  // Build unified day list (union of report dates + booking dates, last 60 days)
  const allDates = new Set([...reports.map((r) => r.date), ...dailyRevenue.map((r) => r.date)]);
  const sortedDates = [...allDates].sort((a, b) => (a > b ? -1 : 1)).slice(0, 60);

  return (
    <div className="px-4 py-8 space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">My Cash Flow</h1>
        <p className="mt-1 text-sm text-zinc-500">{staffName} · Day-by-day cash log</p>
      </div>

      {/* Log income/withdrawals as they happen, side by side with the EOD report */}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <section className="rounded-lg border border-zinc-200 bg-blue-50/60 p-5 dark:border-zinc-800 dark:bg-blue-950/10">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
            Record cash income
          </h2>
          <IncomeForm defaultDate={today} />
        </section>

        <section className="rounded-lg border border-zinc-200 bg-rose-50/60 p-5 dark:border-zinc-800 dark:bg-rose-950/10">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
            Record cash withdrawal
          </h2>
          <WithdrawalForm defaultDate={today} />
        </section>

        <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
            {today} — EOD report
          </p>
          {todayReport && (
            <p className="text-xs text-zinc-500 mb-3">
              Last submitted: {fmt(todayReport.amountReported)}
              {todayReport.notes ? ` · "${todayReport.notes}"` : ''}
            </p>
          )}
          <CashReportForm
            defaultDate={today}
            existingAmount={todayReport?.amountReported}
            existingNotes={todayReport?.notes ?? undefined}
          />
        </section>
      </div>

      {/* Day-by-day table */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">History</h2>
        {sortedDates.length === 0 ? (
          <p className="text-sm text-zinc-400">No data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 text-right font-medium">Cash in</th>
                  <th className="pb-2 text-right font-medium">Reported</th>
                  <th className="pb-2 text-center font-medium">Variance</th>
                  <th className="pb-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {sortedDates.map((date) => {
                  const cashIn = revenueByDate.get(date) ?? 0;
                  const report = reports.find((r) => r.date === date);
                  const reported = report ? parseFloat(report.amountReported) : null;
                  const variance = reported !== null ? reported - cashIn : null;

                  return (
                    <tr
                      key={date}
                      className={date === today ? 'bg-zinc-50 dark:bg-zinc-900/40' : ''}
                    >
                      <td className="py-3 pr-4 text-zinc-500 whitespace-nowrap">
                        {date}
                        {date === today && (
                          <span className="ml-1.5 rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-700">
                            today
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right text-zinc-500 whitespace-nowrap">
                        {cashIn > 0 ? fmt(cashIn) : '—'}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                        {reported !== null ? (
                          fmt(reported)
                        ) : (
                          <span className="text-zinc-400 text-xs">not submitted</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        {variance !== null ? varianceBadge(variance) : '—'}
                      </td>
                      <td className="py-3 text-zinc-400 text-xs max-w-[160px] truncate">
                        {report?.notes ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Micro-components ───────────────────────────────────────────────────
function Card({
  label,
  value,
  highlight,
  dim,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  dim?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-4 ${
        highlight
          ? 'border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100'
          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
      }`}
    >
      <p
        className={`text-xs font-medium mb-1 ${
          highlight ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-500'
        }`}
      >
        {label}
      </p>
      <p
        className={`text-lg font-semibold tabular-nums ${
          highlight
            ? 'text-white dark:text-zinc-900'
            : dim
              ? 'text-zinc-400 dark:text-zinc-500'
              : 'text-zinc-900 dark:text-zinc-100'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Stat({ label, value, bold }: { label: ReactNode; value: string; bold?: boolean }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-zinc-500 mb-0.5">{label}</p>
      <p
        className={`text-sm ${bold ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}
      >
        {value}
      </p>
    </div>
  );
}
