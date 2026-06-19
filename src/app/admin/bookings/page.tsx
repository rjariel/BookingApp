import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/db';
import { bookings, clients, packages } from '@/db/schema';
import { requireModule } from '@/lib/permissions';
import StatusBadge from './_components/StatusBadge';

export const metadata = { title: 'Bookings' };

export default async function BookingsPage() {
  await requireModule('bookings');
  const rows = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      amountTotal: bookings.amountTotal,
      client: { name: clients.name },
      package: { name: packages.name },
    })
    .from(bookings)
    .leftJoin(clients, eq(bookings.clientId, clients.id))
    .leftJoin(packages, eq(bookings.packageId, packages.id))
    .orderBy(desc(bookings.startsAt));

  const fmtDate = new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const fmtTime = new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Bookings</h1>
        <Link
          href="/admin/bookings/new"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-80 dark:bg-zinc-100 dark:text-zinc-900"
        >
          + New booking
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">No bookings yet.</p>
          <Link
            href="/admin/bookings/new"
            className="mt-3 inline-block text-sm underline underline-offset-2 text-zinc-700 dark:text-zinc-300"
          >
            Create your first booking
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-700">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={`/admin/bookings/${row.id}`}
              className="flex items-center justify-between px-4 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {row.client?.name ?? '—'}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {row.package?.name} · {fmtDate.format(row.startsAt)},{' '}
                  {fmtTime.format(row.startsAt)} – {fmtTime.format(row.endsAt)}
                </p>
              </div>
              <div className="ml-4 flex items-center gap-4">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  ₱
                  {parseFloat(row.amountTotal).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                  })}
                </span>
                <StatusBadge status={row.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
