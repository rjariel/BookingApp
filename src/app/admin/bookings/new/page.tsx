import { and, asc, eq, isNull } from 'drizzle-orm';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { addons, clients, packageAddons, packages, paymentModes } from '@/db/schema';
import { requireModule } from '@/lib/permissions';
import BookingForm from '../_components/BookingForm';
import { createBooking } from '../actions';

export const metadata = { title: 'New Booking' };

export default async function NewBookingPage() {
  await requireModule('bookings');
  const [clientList, packageList, modeList] = await Promise.all([
    db
      .select({ id: clients.id, name: clients.name, phone: clients.phone, email: clients.email })
      .from(clients)
      .orderBy(asc(clients.name)),
    db
      .select({
        id: packages.id,
        name: packages.name,
        price: packages.price,
        durationMin: packages.durationMin,
      })
      .from(packages)
      .where(eq(packages.active, true))
      .orderBy(asc(packages.name)),
    db
      .select({ id: paymentModes.id, name: paymentModes.name })
      .from(paymentModes)
      .where(eq(paymentModes.active, true))
      .orderBy(asc(paymentModes.createdAt)),
  ]);

  // Build addonsMap: for each package, fetch available addons
  const addonsMap: Record<string, { id: string; name: string; price: string }[]> = {};

  for (const pkg of packageList) {
    const customAddons = await db
      .select({ id: addons.id, name: addons.name, price: addons.price })
      .from(addons)
      .where(and(eq(addons.packageId, pkg.id), eq(addons.active, true)));

    const linkedGlobalAddons = await db
      .select({ addon: { id: addons.id, name: addons.name, price: addons.price } })
      .from(addons)
      .innerJoin(packageAddons, eq(packageAddons.addonId, addons.id))
      .where(
        and(eq(packageAddons.packageId, pkg.id), eq(addons.active, true), isNull(addons.packageId)),
      );

    // Combine and deduplicate by ID
    const combined = [...customAddons, ...linkedGlobalAddons.map((row) => row.addon)];
    const deduped = Array.from(new Map(combined.map((a) => [a.id, a])).values());
    addonsMap[pkg.id] = deduped;
  }

  if (packageList.length === 0) {
    return (
      <div className="px-4 py-12">
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-4 text-sm text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400">
          No active packages found. Please{' '}
          <Link href="/admin/packages/new" className="underline">
            create a package
          </Link>{' '}
          first.
        </div>
      </div>
    );
  }

  async function handleCreate(formData: FormData) {
    'use server';
    const result = await createBooking(formData);
    if (result.ok) {
      redirect(`/admin/bookings/${result.data.id}`);
    }
    return result;
  }

  return (
    <div className="px-4 py-8">
      <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/admin/bookings" className="hover:text-zinc-700 dark:hover:text-zinc-300">
          Bookings
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100">New</span>
      </div>

      <h1 className="mb-8 text-xl font-semibold text-zinc-900 dark:text-zinc-100">New Booking</h1>

      <BookingForm
        clients={clientList}
        packages={packageList}
        addonsMap={addonsMap}
        paymentModes={modeList}
        action={handleCreate}
      />
    </div>
  );
}
