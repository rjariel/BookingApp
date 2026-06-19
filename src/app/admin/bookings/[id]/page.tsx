import { asc, eq, isNull } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import {
  addons,
  bookingAddons,
  bookingItems,
  bookings,
  clients,
  inventoryItems,
  packageAddons,
  packages,
  paymentModes,
} from '@/db/schema';
import { requireModule } from '@/lib/permissions';
import AddonsEditForm from '../_components/AddonsEditForm';
import NotesForm from '../_components/NotesForm';
import PackageEditor from '../_components/PackageEditor';
import PaymentBadge from '../_components/PaymentBadge';
import RecordPaymentForm from '../_components/RecordPaymentForm';
import StatusBadge from '../_components/StatusBadge';
import StatusTransitionButton from '../_components/StatusTransitionButton';
import { updateBookingPayment } from '../actions';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Booking ${id.slice(0, 8)}` };
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule('bookings');
  const { id } = await params;

  const [booking] = await db
    .select({
      id: bookings.id,
      packageId: bookings.packageId,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      amountTotal: bookings.amountTotal,
      amountPaid: bookings.amountPaid,
      paymentStatus: bookings.paymentStatus,
      notes: bookings.notes,
      createdAt: bookings.createdAt,
      client: { id: clients.id, name: clients.name, phone: clients.phone, email: clients.email },
      package: {
        id: packages.id,
        name: packages.name,
        price: packages.price,
        durationMin: packages.durationMin,
      },
      paymentMode: { id: paymentModes.id, name: paymentModes.name },
    })
    .from(bookings)
    .leftJoin(clients, eq(bookings.clientId, clients.id))
    .leftJoin(packages, eq(bookings.packageId, packages.id))
    .leftJoin(paymentModes, eq(bookings.paymentModeId, paymentModes.id))
    .where(eq(bookings.id, id))
    .limit(1);

  if (!booking) notFound();

  // Fetch all active payment modes for the record-payment form
  const allPaymentModes = await db
    .select({ id: paymentModes.id, name: paymentModes.name })
    .from(paymentModes)
    .where(eq(paymentModes.active, true));

  const [addonRows, _itemRows, customAddonsForPackage, linkedGlobalAddons] = await Promise.all([
    // Fetch booking add-ons
    db
      .select({
        id: bookingAddons.id,
        addonId: bookingAddons.addonId,
        qty: bookingAddons.qty,
        unitPrice: bookingAddons.unitPrice,
        addon: { id: addons.id, name: addons.name },
      })
      .from(bookingAddons)
      .leftJoin(addons, eq(bookingAddons.addonId, addons.id))
      .where(eq(bookingAddons.bookingId, id)),
    // Fetch booking items
    db
      .select({
        id: bookingItems.id,
        qty: bookingItems.qty,
        item: { id: inventoryItems.id, name: inventoryItems.name },
      })
      .from(bookingItems)
      .leftJoin(inventoryItems, eq(bookingItems.itemId, inventoryItems.id))
      .where(eq(bookingItems.bookingId, id)),
    // Fetch custom add-ons for this package
    db
      .select()
      .from(addons)
      .where(eq(addons.packageId, booking.packageId as string) && eq(addons.active, true)),
    // Fetch global add-ons linked to this package
    db
      .select({ addon: addons })
      .from(addons)
      .innerJoin(packageAddons, eq(packageAddons.addonId, addons.id))
      .where(
        eq(packageAddons.packageId, booking.packageId as string) &&
          eq(addons.active, true) &&
          isNull(addons.packageId),
      ),
  ]);

  // Combine custom and linked global add-ons
  const availableAddons = [
    ...customAddonsForPackage,
    ...linkedGlobalAddons.map((row) => row.addon),
  ];

  // Fetch all active packages for the package editor
  const allActivePackages = await db
    .select({ id: packages.id, name: packages.name, price: packages.price })
    .from(packages)
    .where(eq(packages.active, true))
    .orderBy(asc(packages.name));

  const fmt = new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const fmtMoney = (v: string) =>
    `₱${parseFloat(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const balanceDue = parseFloat(booking.amountTotal) - parseFloat(booking.amountPaid);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/admin/bookings" className="hover:text-zinc-700 dark:hover:text-zinc-300">
          Bookings
        </Link>
        <span>/</span>
        <span className="font-mono text-zinc-900 dark:text-zinc-100">{id.slice(0, 8)}</span>
      </div>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {booking.client?.name ?? '—'}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {booking.client?.phone} {booking.client?.email ? `· ${booking.client.email}` : ''}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* Status transitions */}
      <div className="mb-8">
        <StatusTransitionButton bookingId={id} currentStatus={booking.status} />
      </div>

      {/* Detail grid */}
      <div className="mb-8 divide-y divide-zinc-100 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-700">
        {/* Package with edit button */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-zinc-500">Package</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {booking.package?.name ?? '—'}
            </span>
            {['pending', 'confirmed'].includes(booking.status) && (
              <PackageEditor
                bookingId={id}
                currentPackageId={booking.packageId}
                packages={allActivePackages}
              />
            )}
          </div>
        </div>
        <Row label="Starts" value={fmt.format(booking.startsAt)} />
        <Row label="Ends" value={fmt.format(booking.endsAt)} />
        <Row label="Duration" value={`${booking.package?.durationMin ?? 0} min`} />
        <Row label="Created" value={fmt.format(booking.createdAt)} />
      </div>

      {/* Add-ons */}
      <section className="mb-8">
        <AddonsEditForm
          bookingId={id}
          currentAddons={addonRows}
          availableAddons={availableAddons}
          packagePrice={booking.package?.price ?? '0'}
          currentTotal={booking.amountTotal}
          canEdit={['pending', 'confirmed'].includes(booking.status)}
        />
      </section>

      {/* Total + Payment */}
      <div className="mb-8 divide-y divide-zinc-100 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-700">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-zinc-500">Package price</span>
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {fmtMoney(booking.package?.price ?? '0')}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-zinc-500">Total</span>
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {fmtMoney(booking.amountTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-zinc-500">Amount paid</span>
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {fmtMoney(booking.amountPaid)}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-zinc-500">Balance due</span>
          <span
            className={`text-sm font-semibold ${
              balanceDue > 0
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {balanceDue > 0 ? fmtMoney(String(balanceDue)) : 'Fully paid'}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-zinc-500">Payment method</span>
          <span className="text-sm text-zinc-800 dark:text-zinc-200">
            {booking.paymentMode?.name ?? <span className="text-zinc-400">—</span>}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-zinc-500">Payment status</span>
          <PaymentBadge status={booking.paymentStatus} />
        </div>
      </div>

      {/* Record payment */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Payment</h2>
        <RecordPaymentForm
          bookingId={id}
          amountTotal={booking.amountTotal}
          amountPaid={booking.amountPaid}
          paymentModeId={booking.paymentMode?.id ?? null}
          paymentModes={allPaymentModes}
          action={async (formData: FormData) => {
            'use server';
            return updateBookingPayment(id, formData);
          }}
        />
      </section>

      {/* Notes */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notes</h2>
        <NotesForm bookingId={id} currentNotes={booking.notes ?? ''} />
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{value}</span>
    </div>
  );
}
