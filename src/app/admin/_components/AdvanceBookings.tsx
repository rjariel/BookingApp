import { and, asc, eq, gte, inArray } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/db';
import { bookings, clients, packages } from '@/db/schema';
import { fmtPhDate, fmtPhTime, phDayBounds } from '@/lib/timezone';
import AdvanceBookingPill from '../bookings/_components/AdvanceBookingPill';

const fmtDate = fmtPhDate;
const fmtTime = fmtPhTime;

const UPCOMING_LIMIT = 5;

async function getAdvanceBookings() {
  // "Tomorrow" onward — same PH-calendar-date cutoff as `isAdvanceBooking`.
  const { end: tomorrowStart } = phDayBounds();

  return db
    .select({
      id: bookings.id,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      amountTotal: bookings.amountTotal,
      client: { name: clients.name },
      package: { name: packages.name },
    })
    .from(bookings)
    .leftJoin(clients, eq(bookings.clientId, clients.id))
    .leftJoin(packages, eq(bookings.packageId, packages.id))
    .where(
      and(
        gte(bookings.startsAt, tomorrowStart),
        inArray(bookings.status, ['pending', 'confirmed']),
      ),
    )
    .orderBy(asc(bookings.startsAt))
    .limit(UPCOMING_LIMIT);
}

export default async function AdvanceBookings() {
  const rows = await getAdvanceBookings();

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Advance bookings
      </h2>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 py-10 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-400">No bookings scheduled beyond today.</p>
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
                  {row.package?.name} · {fmtDate.format(row.startsAt)},{' '}
                  {fmtTime.format(row.startsAt)} – {fmtTime.format(row.endsAt)}
                </p>
                <AdvanceBookingPill startsAt={row.startsAt} className="mt-1.5" />
              </div>
              <div className="ml-4 shrink-0 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                ₱
                {parseFloat(row.amountTotal).toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                })}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
