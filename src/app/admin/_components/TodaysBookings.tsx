import { and, asc, eq, gte, lt } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/db';
import { bookings, clients, packages } from '@/db/schema';
import { fmtPhDate, fmtPhTime, phDateStr, phDayBounds } from '@/lib/timezone';
import StatusBadge from '../bookings/_components/StatusBadge';

const fmtTime = fmtPhTime;

async function getBookingsForDate(date: string) {
  const { start, end } = phDayBounds(new Date(`${date}T00:00:00+08:00`));

  return db
    .select({
      id: bookings.id,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      amountTotal: bookings.amountTotal,
      amountPaid: bookings.amountPaid,
      paymentStatus: bookings.paymentStatus,
      client: { name: clients.name },
      package: { name: packages.name },
    })
    .from(bookings)
    .leftJoin(clients, eq(bookings.clientId, clients.id))
    .leftJoin(packages, eq(bookings.packageId, packages.id))
    .where(and(gte(bookings.startsAt, start), lt(bookings.startsAt, end)))
    .orderBy(asc(bookings.startsAt));
}

export default async function TodaysBookings({ date }: { date?: string } = {}) {
  const selectedDate = date ?? phDateStr();
  const rows = await getBookingsForDate(selectedDate);
  const isToday = selectedDate === phDateStr();
  const dateLabel = fmtPhDate.format(new Date(`${selectedDate}T12:00:00+08:00`));

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        {isToday ? "Today's bookings" : `Bookings on ${dateLabel}`}{' '}
        <span className="font-normal text-zinc-400">({rows.length})</span>
      </h2>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 py-10 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-400">
            No bookings scheduled {isToday ? 'for today' : `on ${dateLabel}`}.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-700">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={`/admin/bookings/${row.id}`}
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {row.client?.name ?? '—'}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {row.package?.name} · {fmtTime.format(row.startsAt)} –{' '}
                  {fmtTime.format(row.endsAt)}
                </p>
              </div>
              <div className="ml-4 flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    ₱
                    {parseFloat(row.amountTotal).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  {row.paymentStatus === 'partial' && (
                    <p className="text-xs text-orange-500">
                      ₱
                      {parseFloat(row.amountPaid).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      paid · ₱
                      {(parseFloat(row.amountTotal) - parseFloat(row.amountPaid)).toLocaleString(
                        'en-PH',
                        { minimumFractionDigits: 2 },
                      )}{' '}
                      due
                    </p>
                  )}
                  {row.paymentStatus === 'unpaid' && <p className="text-xs text-red-500">Unpaid</p>}
                  {row.paymentStatus === 'paid' && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Paid</p>
                  )}
                </div>
                <StatusBadge status={row.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
