'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/db';
import { addons } from '@/db/schema';
import { logActivity } from '@/lib/activity-log';

async function getActorId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

const addonSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price (e.g. 50.00)')
    .default('0'),
});

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

// ── createAddon ────────────────────────────────────────────────────────

export async function createAddon(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const actorId = await getActorId();
  const parsed = addonSchema.safeParse({
    name: formData.get('name'),
    price: formData.get('price') || '0',
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { name, price } = parsed.data;

  const [addon] = await db.insert(addons).values({ name, price }).returning({ id: addons.id });

  if (!addon) return { ok: false, error: 'Failed to create add-on.' };

  await logActivity({
    actorId,
    action: 'create',
    entityType: 'addon',
    entityId: addon.id,
    summary: { name, price },
  });

  revalidatePath('/admin/addons');
  return { ok: true, data: { id: addon.id } };
}

// ── updateAddon ────────────────────────────────────────────────────────

export async function updateAddon(id: string, formData: FormData): Promise<ActionResult> {
  const actorId = await getActorId();
  const parsed = addonSchema.safeParse({
    name: formData.get('name'),
    price: formData.get('price') || '0',
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { name, price } = parsed.data;

  const [existing] = await db
    .select({ id: addons.id })
    .from(addons)
    .where(eq(addons.id, id))
    .limit(1);

  if (!existing) return { ok: false, error: 'Add-on not found.' };

  await db.update(addons).set({ name, price }).where(eq(addons.id, id));

  await logActivity({
    actorId,
    action: 'update',
    entityType: 'addon',
    entityId: id,
    summary: { name, price },
  });

  revalidatePath('/admin/addons');
  revalidatePath(`/admin/addons/${id}`);
  return { ok: true, data: undefined };
}

// ── toggleAddonActive ──────────────────────────────────────────────────

export async function toggleAddonActive(id: string, active: boolean): Promise<ActionResult> {
  const actorId = await getActorId();

  await db.update(addons).set({ active }).where(eq(addons.id, id));

  await logActivity({
    actorId,
    action: active ? 'activate' : 'deactivate',
    entityType: 'addon',
    entityId: id,
  });

  revalidatePath('/admin/addons');
  revalidatePath(`/admin/addons/${id}`);
  return { ok: true, data: undefined };
}
