import { asc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { bookings, clients, packages, paymentModes } from '@/db/schema';
import { isRebookable } from '@/lib/booking-rules';
import { requireModule } from '@/lib/permissions';
import { rebookingDeposit } from '@/lib/pricing';
import RebookForm from '../../_components/RebookForm';
import { rebookBooking } from '../../actions';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Rebook ${id.slice(0, 8)}` };
}

export default async function RebookPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule('bookings');
  const { id } = await params;

  const [booking] = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      client: { name: clients.name },
      package: {
        name: packages.name,
        price: packages.price,
        durationMin: packages.durationMin,
      },
    })
    .from(bookings)
    .leftJoin(clients, eq(bookings.clientId, clients.id))
    .leftJoin(packages, eq(bookings.packageId, packages.id))
    .where(eq(bookings.id, id))
    .limit(1);

  if (!booking?.package) notFound();

  if (!isRebookable(booking.status)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-4 text-sm text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400">
          A booking with status &quot;{booking.status}&quot; cannot be rebooked.
        </div>
        <Link
          href={`/admin/bookings/${id}`}
          className="mt-4 inline-block text-sm underline underline-offset-2 text-zinc-700 dark:text-zinc-300"
        >
          ← Back to booking
        </Link>
      </div>
    );
  }

  const modeList = await db
    .select({ id: paymentModes.id, name: paymentModes.name })
    .from(paymentModes)
    .where(eq(paymentModes.active, true))
    .orderBy(asc(paymentModes.createdAt));

  const requiredDeposit = rebookingDeposit(parseFloat(booking.package.price));

  async function handleRebook(formData: FormData) {
    'use server';
    const result = await rebookBooking(id, formData);
    if (result.ok) {
      redirect(`/admin/bookings/${result.data.id}`);
    }
    return result;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/admin/bookings" className="hover:text-zinc-700 dark:hover:text-zinc-300">
          Bookings
        </Link>
        <span>/</span>
        <Link
          href={`/admin/bookings/${id}`}
          className="hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          {id.slice(0, 8)}
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100">Rebook</span>
      </div>

      <h1 className="mb-8 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Rebook to a new date
      </h1>

      <RebookForm
        originalId={id}
        clientName={booking.client?.name ?? '—'}
        packageName={booking.package.name}
        packagePrice={booking.package.price}
        durationMin={booking.package.durationMin}
        requiredDeposit={requiredDeposit}
        paymentModes={modeList}
        action={handleRebook}
      />
    </div>
  );
}
