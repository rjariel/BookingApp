'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { addons, packageAddons, packageItems, packages } from '@/db/schema';
import { logActivity } from '@/lib/activity-log';
import { requireAdmin } from '@/lib/auth-utils';

const packageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price (e.g. 1500.00)')
    .default('0'),
  durationMin: z.coerce.number().int().min(1, 'Duration must be at least 1 minute').default(60),
  details: z.string().max(2000).optional(),
});

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

// ── createPackage ──────────────────────────────────────────────────────

export async function createPackage(formData: FormData): Promise<ActionResult<{ id: string }>> {
  let actorId: string;
  try {
    actorId = await requireAdmin();
  } catch (_err) {
    return { ok: false, error: 'Admin access required' };
  }

  const parsed = packageSchema.safeParse({
    name: formData.get('name'),
    price: formData.get('price') || '0',
    durationMin: formData.get('durationMin'),
    details: formData.get('details') || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { name, price, durationMin, details } = parsed.data;

  const [pkg] = await db
    .insert(packages)
    .values({ name, price, durationMin, details: details ?? null })
    .returning({ id: packages.id });

  if (!pkg) return { ok: false, error: 'Failed to create package.' };

  await logActivity({
    actorId,
    action: 'create',
    entityType: 'package',
    entityId: pkg.id,
    summary: { name, price, durationMin },
  });

  revalidatePath('/admin/packages');
  return { ok: true, data: { id: pkg.id } };
}

// ── updatePackage ──────────────────────────────────────────────────────

export async function updatePackage(id: string, formData: FormData): Promise<ActionResult> {
  let actorId: string;
  try {
    actorId = await requireAdmin();
  } catch (_err) {
    return { ok: false, error: 'Admin access required' };
  }

  const parsed = packageSchema.safeParse({
    name: formData.get('name'),
    price: formData.get('price') || '0',
    durationMin: formData.get('durationMin'),
    details: formData.get('details') || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { name, price, durationMin, details } = parsed.data;

  const [existing] = await db
    .select({ id: packages.id })
    .from(packages)
    .where(eq(packages.id, id))
    .limit(1);

  if (!existing) return { ok: false, error: 'Package not found.' };

  await db
    .update(packages)
    .set({ name, price, durationMin, details: details ?? null })
    .where(eq(packages.id, id));

  await logActivity({
    actorId,
    action: 'update',
    entityType: 'package',
    entityId: id,
    summary: { name, price, durationMin },
  });

  revalidatePath('/admin/packages');
  revalidatePath(`/admin/packages/${id}`);
  return { ok: true, data: undefined };
}

// ── togglePackageActive ────────────────────────────────────────────────

export async function togglePackageActive(id: string, active: boolean): Promise<ActionResult> {
  let actorId: string;
  try {
    actorId = await requireAdmin();
  } catch (_err) {
    return { ok: false, error: 'Admin access required' };
  }

  await db.update(packages).set({ active }).where(eq(packages.id, id));

  await logActivity({
    actorId,
    action: active ? 'activate' : 'deactivate',
    entityType: 'package',
    entityId: id,
  });

  revalidatePath('/admin/packages');
  revalidatePath(`/admin/packages/${id}`);
  return { ok: true, data: undefined };
}

// ── addPackageItem ─────────────────────────────────────────────────────

export async function addPackageItem(
  packageId: string,
  itemId: string,
  qty: number,
): Promise<ActionResult> {
  let actorId: string;
  try {
    actorId = await requireAdmin();
  } catch (_err) {
    return { ok: false, error: 'Admin access required' };
  }

  if (!itemId || qty < 1) {
    return { ok: false, error: 'Invalid item or quantity.' };
  }

  await db.insert(packageItems).values({ packageId, itemId, qty });

  await logActivity({
    actorId,
    action: 'add_item',
    entityType: 'package',
    entityId: packageId,
    summary: { itemId, qty },
  });

  revalidatePath(`/admin/packages/${packageId}`);
  return { ok: true, data: undefined };
}

// ── updatePackageItem ──────────────────────────────────────────────────

export async function updatePackageItem(
  packageId: string,
  itemId: string,
  qty: number,
): Promise<ActionResult> {
  let actorId: string;
  try {
    actorId = await requireAdmin();
  } catch (_err) {
    return { ok: false, error: 'Admin access required' };
  }

  if (qty < 1) {
    return { ok: false, error: 'Quantity must be at least 1.' };
  }

  const [existing] = await db
    .select({ id: packageItems.id })
    .from(packageItems)
    .where(and(eq(packageItems.packageId, packageId), eq(packageItems.itemId, itemId)))
    .limit(1);

  if (!existing) return { ok: false, error: 'Item not found in package.' };

  await db
    .update(packageItems)
    .set({ qty })
    .where(and(eq(packageItems.packageId, packageId), eq(packageItems.itemId, itemId)));

  await logActivity({
    actorId,
    action: 'update_item',
    entityType: 'package',
    entityId: packageId,
    summary: { itemId, qty },
  });

  revalidatePath(`/admin/packages/${packageId}`);
  return { ok: true, data: undefined };
}

// ── removePackageItem ──────────────────────────────────────────────────

export async function removePackageItem(packageId: string, itemId: string): Promise<ActionResult> {
  let actorId: string;
  try {
    actorId = await requireAdmin();
  } catch (_err) {
    return { ok: false, error: 'Admin access required' };
  }

  const [existing] = await db
    .select({ id: packageItems.id })
    .from(packageItems)
    .where(and(eq(packageItems.packageId, packageId), eq(packageItems.itemId, itemId)))
    .limit(1);

  if (!existing) return { ok: false, error: 'Item not found in package.' };

  await db
    .delete(packageItems)
    .where(and(eq(packageItems.packageId, packageId), eq(packageItems.itemId, itemId)));

  await logActivity({
    actorId,
    action: 'remove_item',
    entityType: 'package',
    entityId: packageId,
    summary: { itemId },
  });

  revalidatePath(`/admin/packages/${packageId}`);
  return { ok: true, data: undefined };
}

// ── linkGlobalAddon ────────────────────────────────────────────────────

export async function linkGlobalAddon(packageId: string, addonId: string): Promise<ActionResult> {
  let actorId: string;
  try {
    actorId = await requireAdmin();
  } catch (_err) {
    return { ok: false, error: 'Admin access required' };
  }

  // Check if addon already linked
  const [existing] = await db
    .select({ id: packageAddons.id })
    .from(packageAddons)
    .where(and(eq(packageAddons.packageId, packageId), eq(packageAddons.addonId, addonId)))
    .limit(1);

  if (existing) return { ok: false, error: 'Add-on already linked to this package.' };

  await db.insert(packageAddons).values({ packageId, addonId });

  await logActivity({
    actorId,
    action: 'link_addon',
    entityType: 'package',
    entityId: packageId,
    summary: { addonId },
  });

  revalidatePath(`/admin/packages/${packageId}`);
  return { ok: true, data: undefined };
}

// ── unlinkGlobalAddon ──────────────────────────────────────────────────

export async function unlinkGlobalAddon(packageId: string, addonId: string): Promise<ActionResult> {
  let actorId: string;
  try {
    actorId = await requireAdmin();
  } catch (_err) {
    return { ok: false, error: 'Admin access required' };
  }

  const [existing] = await db
    .select({ id: packageAddons.id })
    .from(packageAddons)
    .where(and(eq(packageAddons.packageId, packageId), eq(packageAddons.addonId, addonId)))
    .limit(1);

  if (!existing) return { ok: false, error: 'Add-on not linked to this package.' };

  await db
    .delete(packageAddons)
    .where(and(eq(packageAddons.packageId, packageId), eq(packageAddons.addonId, addonId)));

  await logActivity({
    actorId,
    action: 'unlink_addon',
    entityType: 'package',
    entityId: packageId,
    summary: { addonId },
  });

  revalidatePath(`/admin/packages/${packageId}`);
  return { ok: true, data: undefined };
}

// ── createCustomAddon ──────────────────────────────────────────────────

const addonSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price (e.g. 500.00)')
    .default('0'),
});

export async function createCustomAddon(
  packageId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  let actorId: string;
  try {
    actorId = await requireAdmin();
  } catch (_err) {
    return { ok: false, error: 'Admin access required' };
  }

  const parsed = addonSchema.safeParse({
    name: formData.get('name'),
    price: formData.get('price') || '0',
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { name, price } = parsed.data;

  const [addon] = await db
    .insert(addons)
    .values({ name, price, packageId })
    .returning({ id: addons.id });

  if (!addon) return { ok: false, error: 'Failed to create add-on.' };

  await logActivity({
    actorId,
    action: 'create_addon',
    entityType: 'package',
    entityId: packageId,
    summary: { addonId: addon.id, name, price },
  });

  revalidatePath(`/admin/packages/${packageId}`);
  return { ok: true, data: { id: addon.id } };
}

// ── deleteCustomAddon ──────────────────────────────────────────────────

export async function deleteCustomAddon(packageId: string, addonId: string): Promise<ActionResult> {
  let actorId: string;
  try {
    actorId = await requireAdmin();
  } catch (_err) {
    return { ok: false, error: 'Admin access required' };
  }

  const [addon] = await db
    .select({ id: addons.id, packageId: addons.packageId })
    .from(addons)
    .where(eq(addons.id, addonId))
    .limit(1);

  if (!addon) return { ok: false, error: 'Add-on not found.' };

  // Only allow deletion of custom add-ons (those tied to a specific package)
  if (addon.packageId !== packageId) {
    return { ok: false, error: 'Can only delete custom add-ons for this package.' };
  }

  await db.delete(addons).where(eq(addons.id, addonId));

  await logActivity({
    actorId,
    action: 'delete_addon',
    entityType: 'package',
    entityId: packageId,
    summary: { addonId },
  });

  revalidatePath(`/admin/packages/${packageId}`);
  return { ok: true, data: undefined };
}
