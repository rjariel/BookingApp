'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/db';
import { paymentModes } from '@/db/schema';
import { logActivity } from '@/lib/activity-log';

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function getActorId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

const modeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

export async function createPaymentMode(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const actorId = await getActorId();
  const raw = modeSchema.safeParse({ name: formData.get('name') });
  if (!raw.success) return { ok: false, error: raw.error.issues[0]?.message ?? 'Invalid input.' };

  const [row] = await db
    .insert(paymentModes)
    .values({ name: raw.data.name.trim() })
    .returning({ id: paymentModes.id });

  if (!row) return { ok: false, error: 'Failed to create payment mode.' };

  await logActivity({
    actorId,
    action: 'create',
    entityType: 'payment_mode',
    entityId: row.id,
    summary: { name: raw.data.name },
  });

  revalidatePath('/admin/settings/payment-modes');
  return { ok: true, data: { id: row.id } };
}

export async function updatePaymentMode(id: string, formData: FormData): Promise<ActionResult> {
  const actorId = await getActorId();
  const raw = modeSchema.safeParse({ name: formData.get('name') });
  if (!raw.success) return { ok: false, error: raw.error.issues[0]?.message ?? 'Invalid input.' };

  const [existing] = await db
    .select({ id: paymentModes.id })
    .from(paymentModes)
    .where(eq(paymentModes.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: 'Payment mode not found.' };

  await db.update(paymentModes).set({ name: raw.data.name.trim() }).where(eq(paymentModes.id, id));

  await logActivity({
    actorId,
    action: 'update',
    entityType: 'payment_mode',
    entityId: id,
    summary: { name: raw.data.name },
  });

  revalidatePath('/admin/settings/payment-modes');
  return { ok: true, data: undefined };
}

export async function togglePaymentMode(id: string, active: boolean): Promise<ActionResult> {
  const actorId = await getActorId();

  const [existing] = await db
    .select({ id: paymentModes.id })
    .from(paymentModes)
    .where(eq(paymentModes.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: 'Payment mode not found.' };

  await db.update(paymentModes).set({ active }).where(eq(paymentModes.id, id));

  await logActivity({
    actorId,
    action: active ? 'enable' : 'disable',
    entityType: 'payment_mode',
    entityId: id,
  });

  revalidatePath('/admin/settings/payment-modes');
  return { ok: true, data: undefined };
}
