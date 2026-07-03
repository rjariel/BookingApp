import { and, count, eq, gt, gte, lt, sum } from 'drizzle-orm';
import { db } from '@/db';
import { bookings, expenses, paymentModes } from '@/db/schema';
import { phDateStr, phDayBounds } from '@/lib/timezone';

async function getSnapshot() {
  const { start, end } = phDayBounds();
  const todayStr = phDateStr();

  const [counts, revenueByMode, expenseTotal] = await Promise.all([
    db
      .select({ status: bookings.status, cnt: count() })
      .from(bookings)
      .where(and(gte(bookings.startsAt, start), lt(bookings.startsAt, end)))
      .groupBy(bookings.status),

    // Revenue = all money collected today (any status — confirmed, completed, no_show all count)
    db
      .select({
        modeName: paymentModes.name,
        total: sum(bookings.amountPaid),
      })
      .from(bookings)
      .leftJoin(paymentModes, eq(bookings.paymentModeId, paymentModes.id))
      .where(
        and(
          gte(bookings.startsAt, start),
          lt(bookings.startsAt, end),
          gt(bookings.amountPaid, '0'),
        ),
      )
      .groupBy(paymentModes.name),

    db
      .select({ total: sum(expenses.amount) })
      .from(expenses)
      .where(eq(expenses.spentOn, todayStr)),
  ]);

  const byStatus = Object.fromEntries(counts.map((r) => [r.status, r.cnt]));

  const totalRevenue = revenueByMode.reduce((acc, r) => acc + parseFloat(r.total ?? '0'), 0);

  const totalExpenses = parseFloat(expenseTotal[0]?.total ?? '0');

  return {
    total: counts.reduce((acc, r) => acc + r.cnt, 0),
    pending: byStatus.pending ?? 0,
    confirmed: byStatus.confirmed ?? 0,
    completed: byStatus.completed ?? 0,
    noShow: byStatus.no_show ?? 0,
    totalRevenue,
    totalExpenses,
    cashFlow: totalRevenue - totalExpenses,
    revenueByMode: revenueByMode
      .filter((r) => parseFloat(r.total ?? '0') > 0)
      .map((r) => ({ name: r.modeName ?? 'Unspecified', total: parseFloat(r.total ?? '0') }))
      .sort((a, b) => b.total - a.total),
  };
}

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

function StatCard({
  label,
  value,
  sub,
  children,
}: {
  label: string;
  value: string | number;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</span>
      {sub && <span className="text-xs text-zinc-400">{sub}</span>}
      {children}
    </div>
  );
}

export default async function SnapshotBar({ isAdmin }: { isAdmin: boolean }) {
  const snap = await getSnapshot();

  const bookingsSub =
    [
      snap.pending > 0 && `${snap.pending} pending`,
      snap.confirmed > 0 && `${snap.confirmed} confirmed`,
      snap.completed > 0 && `${snap.completed} done`,
      snap.noShow > 0 && `${snap.noShow} no-show`,
    ]
      .filter(Boolean)
      .join(' · ') || 'none yet';

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Bookings today" value={snap.total} sub={bookingsSub} />

      {isAdmin && (
        <>
          <StatCard
            label="Revenue today"
            value={fmt(snap.totalRevenue)}
            sub={snap.revenueByMode.length === 0 ? 'no payments yet' : undefined}
          >
            {snap.revenueByMode.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {snap.revenueByMode.map((m) => (
                  <div key={m.name} className="flex justify-between text-xs text-zinc-400">
                    <span>{m.name}</span>
                    <span>{fmt(m.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </StatCard>

          <StatCard
            label="Expenses today"
            value={fmt(snap.totalExpenses)}
            sub={snap.totalExpenses > 0 ? 'logged expenses' : 'no expenses yet'}
          />

          <StatCard
            label="Cash flow"
            value={fmt(snap.cashFlow)}
            sub={snap.cashFlow >= 0 ? 'net positive' : 'net negative'}
          />
        </>
      )}
    </div>
  );
}
