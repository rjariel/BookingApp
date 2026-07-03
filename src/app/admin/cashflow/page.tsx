import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { bookings, cashReports, cashWithdrawals, expenses, users } from '@/db/schema';
import { requireModule } from '@/lib/permissions';
import { phDateStr, phDayBounds } from '@/lib/timezone';
import CashReportForm from './_components/CashReportForm';
import WithdrawalForm from './_components/WithdrawalForm';

export const metadata = { title: 'Cash Flow' };

const fmt = (v: string | number | null) =>
  `₱${parseFloat(String(v ?? 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

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
  // 1. Studio totals: all booking payments in, all expenses out, all withdrawals out
  const [incomeRow] = await db
    .select({ total: sql<string>`coalesce(sum(amount_paid), 0)` })
    .from(bookings);

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
  const { start: todayStart, end: todayEnd } = phDayBounds();
  const [todayIncomeRow] = await db
    .select({ total: sql<string>`coalesce(sum(amount_paid), 0)` })
    .from(bookings)
    .where(and(gte(bookings.startsAt, todayStart), lte(bookings.startsAt, todayEnd)));

  const [todayExpRow] = await db
    .select({ total: sql<string>`coalesce(sum(amount), 0)` })
    .from(expenses)
    .where(eq(expenses.spentOn, today));

  const todayIn = parseFloat(todayIncomeRow?.total ?? '0');
  const todayOut = parseFloat(todayExpRow?.total ?? '0');
  const todayNet = todayIn - todayOut;

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

  // 4. Booking revenue per date (to compute "expected" per report)
  // Bucket by PH calendar day, not UTC — matches `cashReports.date` / `spentOn`.
  const dailyRevenue = await db
    .select({
      date: sql<string>`date(starts_at AT TIME ZONE 'Asia/Manila')`,
      total: sql<string>`coalesce(sum(amount_paid), 0)`,
    })
    .from(bookings)
    .groupBy(sql`date(starts_at AT TIME ZONE 'Asia/Manila')`);

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-10">
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
          <Stat label="Collected" value={fmt(todayIn)} />
          <Stat label="Expenses" value={fmt(todayOut)} />
          <Stat label="Net" value={fmt(todayNet)} bold />
        </div>
      </div>

      {/* Record withdrawal */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
          Record cash withdrawal
        </h2>
        <div className="max-w-lg">
          <WithdrawalForm defaultDate={today} />
        </div>
      </section>

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

  // Daily revenue for their bookings (by staffId), bucketed by PH calendar day
  const dailyRevenue = await db
    .select({
      date: sql<string>`date(starts_at AT TIME ZONE 'Asia/Manila')`,
      cashIn: sql<string>`coalesce(sum(amount_paid), 0)`,
    })
    .from(bookings)
    .where(eq(bookings.staffId, staffId))
    .groupBy(sql`date(starts_at AT TIME ZONE 'Asia/Manila')`)
    .orderBy(desc(sql`date(starts_at AT TIME ZONE 'Asia/Manila')`))
    .limit(60);

  const revenueByDate = new Map(dailyRevenue.map((r) => [r.date, parseFloat(r.cashIn)]));

  // Today's existing report (if any)
  const todayReport = reports.find((r) => r.date === today);

  // Build unified day list (union of report dates + booking dates, last 60 days)
  const allDates = new Set([...reports.map((r) => r.date), ...dailyRevenue.map((r) => r.date)]);
  const sortedDates = [...allDates].sort((a, b) => (a > b ? -1 : 1)).slice(0, 60);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">My Cash Flow</h1>
        <p className="mt-1 text-sm text-zinc-500">{staffName} · Day-by-day cash log</p>
      </div>

      {/* EOD submit for today */}
      <section>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
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
        </div>
      </section>

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

function Stat({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <p
        className={`text-sm ${bold ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}
      >
        {value}
      </p>
    </div>
  );
}
