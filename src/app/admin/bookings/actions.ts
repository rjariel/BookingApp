'use server';

import { and, eq, gte, inArray, lt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/db';
import {
  addons,
  bookingAddons,
  bookingItems,
  bookings,
  clients,
  inventoryItems,
  packageItems,
  packages,
  paymentModes,
  stockLedger,
} from '@/db/schema';
import { logActivity } from '@/lib/activity-log';
import { isRebookable } from '@/lib/booking-rules';
import { calcBookingTotal, rebookingDeposit } from '@/lib/pricing';
import { phMonthBounds } from '@/lib/timezone';

// ── Types ──────────────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; conflict?: boolean };

// ── Helpers ────────────────────────────────────────────────────────────

async function getActorId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

function isExclusionViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23P01'
  );
}

// Drizzle wraps failed queries in `DrizzleQueryError`, whose own `.message` is
// just "Failed query: <sql>\nparams: <params>" — the real Postgres reason
// (constraint violation, missing column, etc.) lives on `.cause`. Unwrap it so
// the UI shows something actionable instead of a raw SQL dump.
function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const cause = (err as { cause?: unknown }).cause;
    if (cause instanceof Error && cause.message) return cause.message;
    return err.message;
  }
  return fallback;
}

// ── Schemas ────────────────────────────────────────────────────────────

const addonLineSchema = z.object({
  addonId: z.string().uuid(),
  qty: z.number().int().min(1),
});

const itemLineSchema = z.object({
  itemId: z.string().uuid(),
  qty: z.number().int().min(1),
});

const createBookingSchema = z.object({
  // Client — either existing id or new inline
  clientId: z.string().uuid().optional(),
  clientName: z.string().min(1).max(200).optional(),
  clientPhone: z.string().max(50).optional(),
  clientEmail: z.union([z.string().email(), z.literal('')]).optional(),

  packageId: z.string().uuid('Package is required'),
  startsAt: z.string().datetime({ offset: true }),
  notes: z.string().max(2000).optional(),

  addonsJson: z.string().optional().default('[]'),
  itemsJson: z.string().optional().default('[]'),

  amountPaid: z.coerce.number().min(0),
  paymentModeId: z.string().uuid('Payment method is required'),
});

const statusTransitionMap: Record<string, readonly string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
  rebooked: [],
};

const rebookSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  amountPaid: z.coerce.number().min(0),
  paymentModeId: z.string().uuid('Payment method is required'),
  notes: z.string().max(2000).optional(),
});

// ── createClient (inline) ──────────────────────────────────────────────

export async function createClient(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const actorId = await getActorId();
  const name = (formData.get('name') as string | null)?.trim() ?? '';
  const phone = (formData.get('phone') as string | null)?.trim() || null;
  const email = (formData.get('email') as string | null)?.trim() || null;

  if (!name) return { ok: false, error: 'Client name is required.' };

  const [client] = await db
    .insert(clients)
    .values({ name, phone, email })
    .returning({ id: clients.id });

  if (!client) return { ok: false, error: 'Failed to create client.' };

  await logActivity({
    actorId,
    action: 'create',
    entityType: 'client',
    entityId: client.id,
    summary: { name },
  });

  revalidatePath('/admin/bookings');
  return { ok: true, data: { id: client.id } };
}

// ── createBooking ──────────────────────────────────────────────────────

export async function createBooking(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const actorId = await getActorId();

  const raw = createBookingSchema.safeParse({
    clientId: formData.get('clientId') || undefined,
    clientName: formData.get('clientName') || undefined,
    clientPhone: formData.get('clientPhone') || undefined,
    clientEmail: formData.get('clientEmail') || undefined,
    packageId: formData.get('packageId'),
    startsAt: formData.get('startsAt'),
    notes: formData.get('notes') || undefined,
    addonsJson: formData.get('addonsJson') || '[]',
    itemsJson: formData.get('itemsJson') || '[]',
    amountPaid: formData.get('amountPaid'),
    paymentModeId: formData.get('paymentModeId'),
  });

  if (!raw.success) {
    return { ok: false, error: raw.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const {
    clientId: existingClientId,
    clientName,
    clientPhone,
    clientEmail,
    packageId,
    startsAt: startsAtStr,
    notes,
    addonsJson,
    itemsJson,
    amountPaid,
    paymentModeId,
  } = raw.data;

  // Parse add-on and item lines
  let addonLines: z.infer<typeof addonLineSchema>[] = [];
  let itemLines: z.infer<typeof itemLineSchema>[] = [];
  try {
    addonLines = z.array(addonLineSchema).parse(JSON.parse(addonsJson));
    itemLines = z.array(itemLineSchema).parse(JSON.parse(itemsJson));
  } catch {
    return { ok: false, error: 'Invalid add-ons or items data.' };
  }

  try {
    const bookingId = await db.transaction(async (tx) => {
      // 1. Resolve or create client
      let clientId = existingClientId;
      if (!clientId) {
        if (!clientName)
          throw new Error('Select an existing client or provide a name for a new one.');
        const [newClient] = await tx
          .insert(clients)
          .values({
            name: clientName.trim(),
            phone: clientPhone?.trim() || null,
            email: clientEmail?.trim() || null,
          })
          .returning({ id: clients.id });
        if (!newClient) throw new Error('Failed to create client.');
        clientId = newClient.id;
      }

      // 2. Load package (price + duration)
      const [pkg] = await tx
        .select({ price: packages.price, durationMin: packages.durationMin })
        .from(packages)
        .where(and(eq(packages.id, packageId), eq(packages.active, true)))
        .limit(1);

      if (!pkg) throw new Error('Package not found or inactive.');

      // 2.5. Load package items (FREE/INCLUDED with package)
      const pkgItems = await tx
        .select({ itemId: packageItems.itemId, qty: packageItems.qty })
        .from(packageItems)
        .where(eq(packageItems.packageId, packageId));

      // Merge package items with manually added items (manual overrides package qty)
      const allItemLines = [
        ...pkgItems.map((pi) => ({ itemId: pi.itemId, qty: pi.qty })),
        ...itemLines,
      ];
      const uniqueItems = Array.from(new Map(allItemLines.map((i) => [i.itemId, i])).values());

      const startsAt = new Date(startsAtStr);
      const endsAt = new Date(startsAt.getTime() + pkg.durationMin * 60_000);

      // 3. Snapshot add-on prices (so total is immutable after price changes)
      const addonPrices: Record<string, string> = {};
      if (addonLines.length > 0) {
        const rows = await tx
          .select({ id: addons.id, price: addons.price })
          .from(addons)
          .where(eq(addons.active, true));
        for (const row of rows) addonPrices[row.id] = row.price;
      }

      // Validate all add-on IDs are active
      for (const line of addonLines) {
        if (!addonPrices[line.addonId]) {
          throw new Error(`Add-on not found or inactive: ${line.addonId}`);
        }
      }

      // 4. Compute total
      const packagePrice = parseFloat(pkg.price);
      const addonCalcLines = addonLines.map((l) => ({
        unitPrice: parseFloat(addonPrices[l.addonId] ?? '0'),
        qty: l.qty,
      }));
      const amountTotal = calcBookingTotal(packagePrice, addonCalcLines);

      // 5. Derive payment_status server-side
      const derivedPaymentStatus =
        amountPaid >= amountTotal ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid';

      // Validate payment mode
      const [mode] = await tx
        .select({ id: paymentModes.id })
        .from(paymentModes)
        .where(eq(paymentModes.id, paymentModeId))
        .limit(1);
      if (!mode) throw new Error('Selected payment mode not found.');

      // 6. Insert booking (exclusion constraint fires here on overlap)
      const [booking] = await tx
        .insert(bookings)
        .values({
          clientId,
          packageId,
          startsAt,
          endsAt,
          amountTotal: String(amountTotal),
          amountPaid: String(amountPaid),
          paymentStatus: derivedPaymentStatus as 'unpaid' | 'partial' | 'paid',
          paymentModeId,
          notes: notes ?? null,
          createdBy: actorId,
        })
        .returning({ id: bookings.id });

      if (!booking) throw new Error('Failed to create booking.');

      // 7. Insert booking_addons
      if (addonLines.length > 0) {
        await tx.insert(bookingAddons).values(
          addonLines.map((l) => ({
            bookingId: booking.id,
            addonId: l.addonId,
            qty: l.qty,
            unitPrice: addonPrices[l.addonId] ?? '0',
          })),
        );
      }

      // 8. Deduct inventory and write stock_ledger (package items + manual items)
      if (uniqueItems.length > 0) {
        for (const line of uniqueItems) {
          const [item] = await tx
            .select({ quantity: inventoryItems.quantity, name: inventoryItems.name })
            .from(inventoryItems)
            .where(and(eq(inventoryItems.id, line.itemId), eq(inventoryItems.active, true)))
            .limit(1);

          if (!item) throw new Error(`Item ${line.itemId} not found or inactive.`);
          if (item.quantity < line.qty) {
            throw new Error(
              `Insufficient stock for "${item.name}" (have ${item.quantity}, need ${line.qty}).`,
            );
          }

          await tx
            .update(inventoryItems)
            .set({ quantity: item.quantity - line.qty })
            .where(eq(inventoryItems.id, line.itemId));

          await tx.insert(stockLedger).values({
            itemId: line.itemId,
            delta: -line.qty,
            type: 'usage',
            bookingId: booking.id,
            staffId: actorId,
          });
        }

        await tx.insert(bookingItems).values(
          uniqueItems.map((l) => ({
            bookingId: booking.id,
            itemId: l.itemId,
            qty: l.qty,
          })),
        );
      }

      return booking.id;
    });

    await logActivity({
      actorId,
      action: 'create',
      entityType: 'booking',
      entityId: bookingId,
      summary: { packageId, addonCount: addonLines.length, itemCount: itemLines.length },
    });

    revalidatePath('/admin/bookings');
    return { ok: true, data: { id: bookingId } };
  } catch (err) {
    if (isExclusionViolation(err)) {
      return {
        ok: false,
        conflict: true,
        error:
          'That time slot overlaps an existing booking for this staff member. Please choose a different time.',
      };
    }
    return { ok: false, error: getErrorMessage(err, 'Failed to create booking.') };
  }
}

// ── updateBookingStatus ────────────────────────────────────────────────

export async function updateBookingStatus(id: string, newStatus: string): Promise<ActionResult> {
  const session = await auth();
  const actorId = session?.user?.id ?? null;

  // Permission check: only admin or staff
  if (!session?.user || !['admin', 'staff'].includes(session.user.role)) {
    return { ok: false, error: 'Unauthorized. Only admins and staff can change booking status.' };
  }

  const [booking] = await db
    .select({
      status: bookings.status,
      amountTotal: bookings.amountTotal,
      amountPaid: bookings.amountPaid,
    })
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);

  if (!booking) return { ok: false, error: 'Booking not found.' };

  const allowed = statusTransitionMap[booking.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return {
      ok: false,
      error: `Cannot transition from "${booking.status}" to "${newStatus}".`,
    };
  }

  if (newStatus === 'completed') {
    const balanceDue = parseFloat(booking.amountTotal) - parseFloat(booking.amountPaid);
    if (balanceDue > 0) {
      return {
        ok: false,
        error: `Cannot mark completed: balance of ₱${balanceDue.toFixed(2)} is still due.`,
      };
    }
  }

  await db
    .update(bookings)
    .set({ status: newStatus as typeof booking.status })
    .where(eq(bookings.id, id));

  await logActivity({
    actorId,
    action: 'status_change',
    entityType: 'booking',
    entityId: id,
    summary: { from: booking.status, to: newStatus },
  });

  revalidatePath('/admin/bookings');
  revalidatePath(`/admin/bookings/${id}`);
  return { ok: true, data: undefined };
}

// ── updateBookingNotes ─────────────────────────────────────────────────

export async function updateBookingNotes(id: string, formData: FormData): Promise<ActionResult> {
  const actorId = await getActorId();
  const notes = (formData.get('notes') as string | null)?.trim() || null;

  const [existing] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);

  if (!existing) return { ok: false, error: 'Booking not found.' };

  await db.update(bookings).set({ notes }).where(eq(bookings.id, id));

  await logActivity({
    actorId,
    action: 'update_notes',
    entityType: 'booking',
    entityId: id,
  });

  revalidatePath(`/admin/bookings/${id}`);
  return { ok: true, data: undefined };
}

// ── updateBookingPayment ───────────────────────────────────────────────

const updatePaymentSchema = z.object({
  amountPaid: z.coerce.number().min(0),
  paymentModeId: z.string().uuid().optional().or(z.literal('')),
});

export async function updateBookingPayment(id: string, formData: FormData): Promise<ActionResult> {
  const actorId = await getActorId();

  const raw = updatePaymentSchema.safeParse({
    amountPaid: formData.get('amountPaid'),
    paymentModeId: formData.get('paymentModeId') || undefined,
  });
  if (!raw.success) return { ok: false, error: raw.error.issues[0]?.message ?? 'Invalid input.' };

  const [booking] = await db
    .select({ id: bookings.id, amountTotal: bookings.amountTotal })
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);
  if (!booking) return { ok: false, error: 'Booking not found.' };

  const total = parseFloat(booking.amountTotal);
  const paid = raw.data.amountPaid;
  const paymentStatus = paid <= 0 ? 'unpaid' : paid >= total ? 'paid' : 'partial';

  await db
    .update(bookings)
    .set({
      amountPaid: String(paid),
      paymentStatus,
      paymentModeId: raw.data.paymentModeId || null,
    })
    .where(eq(bookings.id, id));

  await logActivity({
    actorId,
    action: 'update_payment',
    entityType: 'booking',
    entityId: id,
    summary: { amountPaid: paid, paymentStatus },
  });

  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath('/admin');
  return { ok: true, data: undefined };
}

// ── updateBookingAddons ───────────────────────────────────────────────

const updateAddonsSchema = z.object({
  addonsJson: z.string().default('[]'),
});

export async function updateBookingAddons(id: string, formData: FormData): Promise<ActionResult> {
  const actorId = await getActorId();

  const raw = updateAddonsSchema.safeParse({
    addonsJson: formData.get('addonsJson') || '[]',
  });
  if (!raw.success) return { ok: false, error: 'Invalid input.' };

  let addonLines: z.infer<typeof addonLineSchema>[] = [];
  try {
    addonLines = z.array(addonLineSchema).parse(JSON.parse(raw.data.addonsJson));
  } catch {
    return { ok: false, error: 'Invalid add-ons data.' };
  }

  const [booking] = await db
    .select({ id: bookings.id, amountTotal: bookings.amountTotal, packageId: bookings.packageId })
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);
  if (!booking) return { ok: false, error: 'Booking not found.' };

  try {
    await db.transaction(async (tx) => {
      // Load package price
      const [pkg] = await tx
        .select({ price: packages.price })
        .from(packages)
        .where(eq(packages.id, booking.packageId))
        .limit(1);
      if (!pkg) throw new Error('Package not found.');

      // Snapshot current addon prices
      const addonPrices: Record<string, string> = {};
      if (addonLines.length > 0) {
        const rows = await tx
          .select({ id: addons.id, price: addons.price })
          .from(addons)
          .where(eq(addons.active, true));
        for (const row of rows) addonPrices[row.id] = row.price;
      }

      // Validate addon IDs
      for (const line of addonLines) {
        if (!addonPrices[line.addonId]) {
          throw new Error(`Add-on not found or inactive: ${line.addonId}`);
        }
      }

      // Compute new total
      const packagePrice = parseFloat(pkg.price);
      const addonCalcLines = addonLines.map((l) => ({
        unitPrice: parseFloat(addonPrices[l.addonId] ?? '0'),
        qty: l.qty,
      }));
      const amountTotal = calcBookingTotal(packagePrice, addonCalcLines);

      // Delete old booking_addons
      await tx.delete(bookingAddons).where(eq(bookingAddons.bookingId, id));

      // Insert new booking_addons
      if (addonLines.length > 0) {
        await tx.insert(bookingAddons).values(
          addonLines.map((l) => ({
            bookingId: id,
            addonId: l.addonId,
            qty: l.qty,
            unitPrice: addonPrices[l.addonId] ?? '0',
          })),
        );
      }

      // Update booking total (keep payment status derived from current payment)
      const [currentBooking] = await tx
        .select({ amountPaid: bookings.amountPaid })
        .from(bookings)
        .where(eq(bookings.id, id))
        .limit(1);

      const amountPaid = parseFloat(currentBooking?.amountPaid ?? '0');
      const newPaymentStatus =
        amountPaid <= 0 ? 'unpaid' : amountPaid >= amountTotal ? 'paid' : 'partial';

      await tx
        .update(bookings)
        .set({
          amountTotal: String(amountTotal),
          paymentStatus: newPaymentStatus as 'unpaid' | 'partial' | 'paid',
        })
        .where(eq(bookings.id, id));
    });

    await logActivity({
      actorId,
      action: 'update_addons',
      entityType: 'booking',
      entityId: id,
      summary: { addonCount: addonLines.length },
    });

    revalidatePath(`/admin/bookings/${id}`);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: getErrorMessage(err, 'Failed to update add-ons.') };
  }
}

// ── updateBookingPackage ───────────────────────────────────────────────

export async function updateBookingPackage(
  id: string,
  newPackageId: string,
): Promise<ActionResult> {
  const actorId = await getActorId();

  const [booking] = await db
    .select({
      id: bookings.id,
      packageId: bookings.packageId,
      amountPaid: bookings.amountPaid,
      status: bookings.status,
    })
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);

  if (!booking) return { ok: false, error: 'Booking not found.' };

  // Only allow editing pending/confirmed bookings
  if (!['pending', 'confirmed'].includes(booking.status)) {
    return { ok: false, error: 'Can only change package for pending or confirmed bookings.' };
  }

  // Validate new package exists
  const [newPkg] = await db
    .select({ price: packages.price })
    .from(packages)
    .where(eq(packages.id, newPackageId))
    .limit(1);

  if (!newPkg) return { ok: false, error: 'Package not found.' };

  try {
    await db.transaction(async (tx) => {
      // Fetch current add-ons to recalculate total
      const currentAddons = await tx
        .select({ unitPrice: bookingAddons.unitPrice, qty: bookingAddons.qty })
        .from(bookingAddons)
        .where(eq(bookingAddons.bookingId, id));

      const packagePrice = parseFloat(newPkg.price);
      const addonLines = currentAddons.map((a) => ({
        unitPrice: parseFloat(a.unitPrice),
        qty: a.qty,
      }));
      const newTotal = calcBookingTotal(packagePrice, addonLines);

      // Recalculate payment status
      const amountPaid = parseFloat(booking.amountPaid);
      const newPaymentStatus =
        amountPaid <= 0 ? 'unpaid' : amountPaid >= newTotal ? 'paid' : 'partial';

      // Update booking
      await tx
        .update(bookings)
        .set({
          packageId: newPackageId,
          amountTotal: String(newTotal),
          paymentStatus: newPaymentStatus as 'unpaid' | 'partial' | 'paid',
        })
        .where(eq(bookings.id, id));
    });

    await logActivity({
      actorId,
      action: 'update_package',
      entityType: 'booking',
      entityId: id,
      summary: { from: booking.packageId, to: newPackageId },
    });

    revalidatePath(`/admin/bookings/${id}`);
    revalidatePath('/admin/bookings');
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: getErrorMessage(err, 'Failed to update package.') };
  }
}

// ── rebookBooking ───────────────────────────────────────────────────────

/**
 * Rebooks a client onto a new date. Creates a *new* booking (same client and
 * package as the original, its own payment) tagged via `rebookedFromId`, and
 * flips the original booking's status to 'rebooked' so it stops holding its
 * calendar slot. Requires an up-front deposit of 50% of the original
 * package's price.
 */
export async function rebookBooking(
  originalId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user || !['admin', 'staff'].includes(session.user.role)) {
    return { ok: false, error: 'Unauthorized. Only admins and staff can rebook.' };
  }
  const actorId = session.user.id;

  const raw = rebookSchema.safeParse({
    startsAt: formData.get('startsAt'),
    amountPaid: formData.get('amountPaid'),
    paymentModeId: formData.get('paymentModeId'),
    notes: formData.get('notes') || undefined,
  });
  if (!raw.success) {
    return { ok: false, error: raw.error.issues[0]?.message ?? 'Invalid input.' };
  }
  const { startsAt: startsAtStr, amountPaid, paymentModeId, notes } = raw.data;

  const [original] = await db
    .select({
      id: bookings.id,
      clientId: bookings.clientId,
      packageId: bookings.packageId,
      status: bookings.status,
      packagePrice: packages.price,
      durationMin: packages.durationMin,
    })
    .from(bookings)
    .innerJoin(packages, eq(bookings.packageId, packages.id))
    .where(eq(bookings.id, originalId))
    .limit(1);

  if (!original) return { ok: false, error: 'Original booking not found.' };

  if (!isRebookable(original.status)) {
    return { ok: false, error: `A "${original.status}" booking cannot be rebooked.` };
  }

  const requiredDeposit = rebookingDeposit(parseFloat(original.packagePrice));
  if (amountPaid < requiredDeposit) {
    return {
      ok: false,
      error: `Rebooking requires a deposit of at least ₱${requiredDeposit.toFixed(2)} (50% of the original package price).`,
    };
  }

  // Validate payment mode up front so the transaction can't fail on it.
  const [mode] = await db
    .select({ id: paymentModes.id })
    .from(paymentModes)
    .where(eq(paymentModes.id, paymentModeId))
    .limit(1);
  if (!mode) return { ok: false, error: 'Selected payment mode not found.' };

  const startsAt = new Date(startsAtStr);
  const endsAt = new Date(startsAt.getTime() + original.durationMin * 60_000);
  const amountTotal = parseFloat(original.packagePrice);
  const paymentStatus = amountPaid >= amountTotal ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid';

  try {
    const newBookingId = await db.transaction(async (tx) => {
      // Re-check status inside the transaction to avoid a race with another
      // rebook/status-change happening between the read above and here.
      const [current] = await tx
        .select({ status: bookings.status })
        .from(bookings)
        .where(eq(bookings.id, originalId))
        .limit(1);
      if (!current) throw new Error('Original booking not found.');
      if (!isRebookable(current.status)) {
        throw new Error(`A "${current.status}" booking cannot be rebooked.`);
      }

      const [newBooking] = await tx
        .insert(bookings)
        .values({
          clientId: original.clientId,
          packageId: original.packageId,
          startsAt,
          endsAt,
          amountTotal: String(amountTotal),
          amountPaid: String(amountPaid),
          paymentStatus: paymentStatus as 'unpaid' | 'partial' | 'paid',
          paymentModeId,
          notes: notes ?? null,
          createdBy: actorId,
          rebookedFromId: originalId,
        })
        .returning({ id: bookings.id });

      if (!newBooking) throw new Error('Failed to create rebooked booking.');

      await tx.update(bookings).set({ status: 'rebooked' }).where(eq(bookings.id, originalId));

      // Deduct the new session's package-included inventory, same as a
      // fresh createBooking() would for this package. Without this, the
      // rebooked session silently consumes items (prints, frames, etc.)
      // that never get reflected in the stock ledger.
      const pkgItems = await tx
        .select({ itemId: packageItems.itemId, qty: packageItems.qty })
        .from(packageItems)
        .where(eq(packageItems.packageId, original.packageId));

      if (pkgItems.length > 0) {
        for (const line of pkgItems) {
          const [item] = await tx
            .select({ quantity: inventoryItems.quantity, name: inventoryItems.name })
            .from(inventoryItems)
            .where(and(eq(inventoryItems.id, line.itemId), eq(inventoryItems.active, true)))
            .limit(1);

          if (!item) throw new Error(`Item ${line.itemId} not found or inactive.`);
          if (item.quantity < line.qty) {
            throw new Error(
              `Insufficient stock for "${item.name}" (have ${item.quantity}, need ${line.qty}).`,
            );
          }

          await tx
            .update(inventoryItems)
            .set({ quantity: item.quantity - line.qty })
            .where(eq(inventoryItems.id, line.itemId));

          await tx.insert(stockLedger).values({
            itemId: line.itemId,
            delta: -line.qty,
            type: 'usage',
            bookingId: newBooking.id,
            staffId: actorId,
          });
        }

        await tx.insert(bookingItems).values(
          pkgItems.map((l) => ({
            bookingId: newBooking.id,
            itemId: l.itemId,
            qty: l.qty,
          })),
        );
      }

      return newBooking.id;
    });

    await logActivity({
      actorId,
      action: 'rebook',
      entityType: 'booking',
      entityId: originalId,
      summary: { rebookedIntoId: newBookingId },
    });
    await logActivity({
      actorId,
      action: 'create',
      entityType: 'booking',
      entityId: newBookingId,
      summary: { rebookedFromId: originalId, deposit: amountPaid },
    });

    revalidatePath('/admin/bookings');
    revalidatePath(`/admin/bookings/${originalId}`);
    revalidatePath(`/admin/bookings/${newBookingId}`);
    return { ok: true, data: { id: newBookingId } };
  } catch (err) {
    if (isExclusionViolation(err)) {
      return {
        ok: false,
        conflict: true,
        error:
          'That time slot overlaps an existing booking for this staff member. Please choose a different time.',
      };
    }
    return { ok: false, error: getErrorMessage(err, 'Failed to rebook.') };
  }
}

// ── clearBookingsForMonth (testing/reset tool) ─────────────────────────

const clearMonthSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month.'),
});

/**
 * Deletes every booking that starts within the given PH calendar month and
 * releases any inventory it reserved back into stock. Admin-only — meant for
 * wiping test data between staff test rounds, not day-to-day use.
 */
export async function clearBookingsForMonth(
  month: string,
): Promise<ActionResult<{ count: number; itemsRestored: number }>> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { ok: false, error: 'Only admins can clear bookings.' };
  }

  const parsed = clearMonthSchema.safeParse({ month });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid month.' };
  }

  const actorId = session.user.id;
  const { start, end } = phMonthBounds(parsed.data.month);

  try {
    const result = await db.transaction(async (tx) => {
      const monthBookings = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(gte(bookings.startsAt, start), lt(bookings.startsAt, end)));

      if (monthBookings.length === 0) {
        return { count: 0, itemsRestored: 0 };
      }

      const bookingIds = monthBookings.map((b) => b.id);

      // Tally reserved inventory across all affected bookings so we restore
      // it in one adjustment per item rather than one per booking.
      const usedItems = await tx
        .select({ itemId: bookingItems.itemId, qty: bookingItems.qty })
        .from(bookingItems)
        .where(inArray(bookingItems.bookingId, bookingIds));

      const restoreMap = new Map<string, number>();
      for (const row of usedItems) {
        restoreMap.set(row.itemId, (restoreMap.get(row.itemId) ?? 0) + row.qty);
      }

      for (const [itemId, qty] of restoreMap) {
        const [item] = await tx
          .select({ quantity: inventoryItems.quantity })
          .from(inventoryItems)
          .where(eq(inventoryItems.id, itemId))
          .limit(1);
        // Item may have since been deleted — nothing to restore it to.
        if (!item) continue;

        await tx
          .update(inventoryItems)
          .set({ quantity: item.quantity + qty })
          .where(eq(inventoryItems.id, itemId));

        await tx.insert(stockLedger).values({
          itemId,
          delta: qty,
          type: 'adjustment',
          bookingId: null,
          staffId: actorId,
        });
      }

      // Drop the old usage ledger rows tied to these bookings — the bookings
      // themselves are about to be deleted, so keeping orphaned rows around
      // would just be noise.
      await tx.delete(stockLedger).where(inArray(stockLedger.bookingId, bookingIds));

      // Cascades to booking_items and booking_addons.
      await tx.delete(bookings).where(inArray(bookings.id, bookingIds));

      return { count: bookingIds.length, itemsRestored: restoreMap.size };
    });

    await logActivity({
      actorId,
      action: 'clear_month',
      entityType: 'booking',
      summary: {
        month: parsed.data.month,
        count: result.count,
        itemsRestored: result.itemsRestored,
      },
    });

    revalidatePath('/admin/bookings');
    revalidatePath('/admin/inventory');
    revalidatePath('/admin');

    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: getErrorMessage(err, 'Failed to clear bookings.') };
  }
}
