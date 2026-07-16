import { asc, eq, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
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
import { isRebookable } from '@/lib/booking-rules';
import { requireModule } from '@/lib/permissions';
import { fmtPhDateTime } from '@/lib/timezone';
import AddonsEditForm from '../_components/AddonsEditForm';
import AdvanceBookingPill from '../_components/AdvanceBookingPill';
import DeleteBookingButton from '../_components/DeleteBookingButton';
import NotesForm from '../_components/NotesForm';
import PackageEditor from '../_components/PackageEditor';
import RecordPaymentForm from '../_components/RecordPaymentForm';
import StatusBadge from '../_components/StatusBadge';
import StatusTransitionButton from '../_components/StatusTransitionButton';
import { updateBookingAddonsPayment, updateBookingPayment } from '../actions';

const addonsPaymentModes = alias(paymentModes, 'addons_payment_modes');

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Booking ${id.slice(0, 8)}` };
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule('bookings');
  const session = await auth();
  const isAdmin = session?.user?.role === 'admin';
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
      addonsAmountPaid: bookings.addonsAmountPaid,
      notes: bookings.notes,
      createdAt: bookings.createdAt,
      rebookedFromId: bookings.rebookedFromId,
      client: { id: clients.id, name: clients.name, phone: clients.phone, email: clients.email },
      package: {
        id: packages.id,
        name: packages.name,
        price: packages.price,
        durationMin: packages.durationMin,
      },
      paymentMode: { id: paymentModes.id, name: paymentModes.name },
      addonsPaymentMode: { id: addonsPaymentModes.id, name: addonsPaymentModes.name },
    })
    .from(bookings)
    .leftJoin(clients, eq(bookings.clientId, clients.id))
    .leftJoin(packages, eq(bookings.packageId, packages.id))
    .leftJoin(paymentModes, eq(bookings.paymentModeId, paymentModes.id))
    .leftJoin(addonsPaymentModes, eq(bookings.addonsPaymentModeId, addonsPaymentModes.id))
    .where(eq(bookings.id, id))
    .limit(1);

  if (!booking) notFound();

  const canRebook = isRebookable(booking.status);

  const [rebookedInto] =
    booking.status === 'rebooked'
      ? await db
          .select({ id: bookings.id })
          .from(bookings)
          .where(eq(bookings.rebookedFromId, id))
          .limit(1)
      : [];

  const [rebookedFrom] = booking.rebookedFromId
    ? await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(eq(bookings.id, booking.rebookedFromId))
        .limit(1)
    : [];

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

  const fmt = fmtPhDateTime;

  const fmtMoney = (v: string) =>
    `₱${parseFloat(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const balanceDue = parseFloat(booking.amountTotal) - parseFloat(booking.amountPaid);

  // Split the combined total/paid into package (deposit) and add-ons buckets —
  // shown as separate cards so a shop-counter add-ons payment doesn't get
  // muddled with the deposit.
  const packageTotal = parseFloat(booking.package?.price ?? '0');
  const addonsTotal = addonRows.reduce((sum, r) => sum + parseFloat(r.unitPrice) * r.qty, 0);
  const addonsAmountPaidNum = parseFloat(booking.addonsAmountPaid);
  const packageAmountPaid = parseFloat(booking.amountPaid) - addonsAmountPaidNum;
  const packageBalance = packageTotal - packageAmountPaid;
  const addonsBalance = addonsTotal - addonsAmountPaidNum;

  return (
    <div className="px-4 pb-8">
      {/* Breadcrumb — normal flow, not pinned */}
      <div className="flex items-center gap-2 pt-4 text-sm text-zinc-500">
        <Link href="/admin/bookings" className="hover:text-zinc-700 dark:hover:text-zinc-300">
          Bookings
        </Link>
        <span>/</span>
        <span className="font-mono text-zinc-900 dark:text-zinc-100">{id.slice(0, 8)}</span>
      </div>

      {/* Lineage — small print, scrolls away normally */}
      <div className="mt-2 mb-4">
        <AdvanceBookingPill startsAt={booking.startsAt} />
        {rebookedFrom && (
          <p className="mt-2 text-xs text-zinc-500">
            Rebooked from{' '}
            <Link
              href={`/admin/bookings/${rebookedFrom.id}`}
              className="underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {rebookedFrom.id.slice(0, 8)}
            </Link>
          </p>
        )}
        {rebookedInto && (
          <p className="mt-2 text-xs text-zinc-500">
            Rebooked into{' '}
            <Link
              href={`/admin/bookings/${rebookedInto.id}`}
              className="underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {rebookedInto.id.slice(0, 8)}
            </Link>
          </p>
        )}
      </div>

      {/* Sticky action + identity bar — lean by design: buttons on top (in their
          own bento tile), then status + name with the total/balance pill beside it. */}
      <div className="sticky top-12 z-30 -mx-4 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {/* Row 1: actions — bento tile for visual separation */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50/60 p-2 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex flex-wrap items-center gap-2">
            <StatusTransitionButton
              bookingId={id}
              currentStatus={booking.status}
              balanceDue={balanceDue}
            />
            {canRebook && (
              <Link
                href={`/admin/bookings/${id}/rebook`}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Rebook
              </Link>
            )}
          </div>
          {isAdmin && (
            <DeleteBookingButton bookingId={id} clientName={booking.client?.name ?? ''} />
          )}
        </div>

        {/* Row 2: status + name + total/balance pills, all together */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={booking.status} />
          <h1 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {booking.client?.name ?? '—'}
          </h1>
          <span className="ml-auto flex flex-wrap items-center gap-1.5">
            <span className="whitespace-nowrap rounded-full bg-zinc-900 px-3 py-1 text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
              <span className="mr-1 text-[10px] font-medium tracking-wide text-zinc-300 uppercase dark:text-zinc-600">
                Total
              </span>
              {fmtMoney(booking.amountTotal)}
            </span>
            {balanceDue > 0 && (
              <span className="whitespace-nowrap rounded-full bg-orange-600 px-3 py-1 text-sm font-bold text-white dark:bg-orange-500">
                <span className="mr-1 text-[10px] font-medium tracking-wide text-orange-100 uppercase">
                  Balance
                </span>
                {fmtMoney(String(balanceDue))}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Details — bento grid, normal flow right below the sticky bar. */}
      <div className="mt-4 mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 sm:col-span-1 lg:col-span-2 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">Package</p>
            {['pending', 'confirmed'].includes(booking.status) && (
              <PackageEditor
                bookingId={id}
                currentPackageId={booking.packageId}
                packages={allActivePackages}
              />
            )}
          </div>
          <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {booking.package?.name ?? '—'}
          </p>
        </div>
        <BentoStat label="Starts" value={fmt.format(booking.startsAt)} />
        <BentoStat label="Ends" value={fmt.format(booking.endsAt)} />
        <BentoStat label="Duration" value={`${booking.package?.durationMin ?? 0} min`} />
        <BentoStat label="Created" value={fmt.format(booking.createdAt)} />
      </div>

      {/* Add-ons */}
      <section className="mt-8 mb-8">
        <AddonsEditForm
          bookingId={id}
          currentAddons={addonRows}
          availableAddons={availableAddons}
          packagePrice={booking.package?.price ?? '0'}
          currentTotal={booking.amountTotal}
          canEdit={['pending', 'confirmed'].includes(booking.status)}
        />
      </section>

      {/* Package + add-ons payment — bento tiles, side by side, tinted to tell the
          two money buckets apart at a glance. */}
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        {/* Package / deposit payment */}
        <section
          id="package-payment"
          className={`scroll-mt-[11rem] rounded-xl border border-violet-200/60 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/10 ${
            addonsTotal > 0 ? '' : 'md:col-span-2'
          }`}
        >
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Package payment
          </h2>
          <div className="mb-3 divide-y divide-violet-100 rounded-md border border-violet-200/60 bg-white text-sm dark:divide-violet-900/40 dark:border-violet-900/40 dark:bg-zinc-950">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-zinc-500">Package price</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {fmtMoney(booking.package?.price ?? '0')}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-zinc-500">Package balance</span>
              <span
                className={`font-semibold ${
                  packageBalance > 0
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {packageBalance > 0 ? fmtMoney(String(packageBalance)) : 'Fully paid'}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-zinc-500">Payment method</span>
              <span className="text-zinc-800 dark:text-zinc-200">
                {booking.paymentMode?.name ?? <span className="text-zinc-400">—</span>}
              </span>
            </div>
          </div>
          <RecordPaymentForm
            bookingId={id}
            title="Record deposit payment"
            triggerLabel="Record deposit payment"
            amountFieldName="amountPaid"
            modeFieldName="paymentModeId"
            amountHelpText="New cumulative package amount paid (₱) — deposit only, not add-ons"
            amountTotal={String(packageTotal)}
            amountPaid={String(packageAmountPaid)}
            paymentModeId={booking.paymentMode?.id ?? null}
            paymentModes={allPaymentModes}
            action={async (formData: FormData) => {
              'use server';
              return updateBookingPayment(id, formData);
            }}
          />
        </section>

        {/* Add-ons payment — separate bucket, own payment method (e.g. cash at the shop) */}
        {addonsTotal > 0 && (
          <section
            id="addons-payment"
            className="scroll-mt-[11rem] rounded-xl border border-blue-200/60 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/10"
          >
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Add-ons payment
            </h2>
            <div className="mb-3 divide-y divide-blue-100 rounded-md border border-blue-200/60 bg-white text-sm dark:divide-blue-900/40 dark:border-blue-900/40 dark:bg-zinc-950">
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-zinc-500">Add-ons total</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {fmtMoney(String(addonsTotal))}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-zinc-500">Add-ons balance</span>
                <span
                  className={`font-semibold ${
                    addonsBalance > 0
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {addonsBalance > 0 ? fmtMoney(String(addonsBalance)) : 'Fully paid'}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-zinc-500">Payment method</span>
                <span className="text-zinc-800 dark:text-zinc-200">
                  {booking.addonsPaymentMode?.name ?? <span className="text-zinc-400">—</span>}
                </span>
              </div>
            </div>
            <RecordPaymentForm
              bookingId={id}
              title="Record add-ons payment"
              triggerLabel="Record add-ons payment"
              amountFieldName="addonsAmountPaid"
              modeFieldName="addonsPaymentModeId"
              amountHelpText="New cumulative add-ons amount paid (₱) — separate from the deposit"
              amountTotal={String(addonsTotal)}
              amountPaid={String(addonsAmountPaidNum)}
              paymentModeId={booking.addonsPaymentMode?.id ?? null}
              paymentModes={allPaymentModes}
              action={async (formData: FormData) => {
                'use server';
                return updateBookingAddonsPayment(id, formData);
              }}
            />
          </section>
        )}
      </div>

      {/* Notes */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notes</h2>
        <NotesForm bookingId={id} currentNotes={booking.notes ?? ''} />
      </section>
    </div>
  );
}

function BentoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}
