'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/db';
import { inventoryItems, stockLedger } from '@/db/schema';
import { logActivity } from '@/lib/activity-log';

// ── Helpers ────────────────────────────────────────────────────────────

async function getActorId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// ── Schemas ────────────────────────────────────────────────────────────

const itemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price (e.g. 12.50)')
    .default('0'),
  description: z.string().max(1000).optional(),
  quantity: z.coerce.number().int().min(0, 'Quantity must be ≥ 0').default(0),
  reorderLevel: z.coerce.number().int().min(0, 'Reorder level must be ≥ 0').default(0),
});

const adjustSchema = z.object({
  itemId: z.string().uuid(),
  delta: z.coerce
    .number()
    .int()
    .refine((n) => n !== 0, 'Delta cannot be zero'),
  type: z.enum(['restock', 'adjustment', 'wastage']),
});

// ── Result type ────────────────────────────────────────────────────────

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

// ── createItem ─────────────────────────────────────────────────────────

export async function createItem(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const actorId = await getActorId();
  const parsed = itemSchema.safeParse({
    name: formData.get('name'),
    price: formData.get('price') || '0',
    description: formData.get('description') || undefined,
    quantity: formData.get('quantity'),
    reorderLevel: formData.get('reorderLevel'),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { name, price, description, quantity, reorderLevel } = parsed.data;

  const [item] = await db
    .insert(inventoryItems)
    .values({ name, price, description: description ?? null, quantity, reorderLevel })
    .returning({ id: inventoryItems.id });

  if (!item) return { ok: false, error: 'Failed to create item.' };

  // Seed ledger if initial quantity > 0
  if (quantity > 0) {
    await db.insert(stockLedger).values({
      itemId: item.id,
      delta: quantity,
      type: 'restock',
      staffId: actorId,
    });
  }

  await logActivity({
    actorId,
    action: 'create',
    entityType: 'inventory_item',
    entityId: item.id,
    summary: { name, quantity },
  });

  revalidatePath('/admin/inventory');
  return { ok: true, data: { id: item.id } };
}

// ── updateItem ─────────────────────────────────────────────────────────

export async function updateItem(id: string, formData: FormData): Promise<ActionResult> {
  const actorId = await getActorId();
  const parsed = itemSchema.safeParse({
    name: formData.get('name'),
    price: formData.get('price') || '0',
    description: formData.get('description') || undefined,
    quantity: formData.get('quantity'),
    reorderLevel: formData.get('reorderLevel'),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { name, price, description, quantity, reorderLevel } = parsed.data;

  const [before] = await db
    .select({ quantity: inventoryItems.quantity })
    .from(inventoryItems)
    .where(eq(inventoryItems.id, id))
    .limit(1);

  if (!before) return { ok: false, error: 'Item not found.' };

  await db
    .update(inventoryItems)
    .set({ name, price, description: description ?? null, quantity, reorderLevel })
    .where(eq(inventoryItems.id, id));

  // Log quantity change to ledger as adjustment
  const delta = quantity - before.quantity;
  if (delta !== 0) {
    await db.insert(stockLedger).values({
      itemId: id,
      delta,
      type: 'adjustment',
      staffId: actorId,
    });
  }

  await logActivity({
    actorId,
    action: 'update',
    entityType: 'inventory_item',
    entityId: id,
    summary: { name, quantityDelta: delta },
  });

  revalidatePath('/admin/inventory');
  revalidatePath(`/admin/inventory/${id}`);
  return { ok: true, data: undefined };
}

// ── toggleActive ───────────────────────────────────────────────────────

export async function toggleActive(id: string, active: boolean): Promise<ActionResult> {
  const actorId = await getActorId();

  await db.update(inventoryItems).set({ active }).where(eq(inventoryItems.id, id));

  await logActivity({
    actorId,
    action: active ? 'activate' : 'deactivate',
    entityType: 'inventory_item',
    entityId: id,
  });

  revalidatePath('/admin/inventory');
  revalidatePath(`/admin/inventory/${id}`);
  return { ok: true, data: undefined };
}

// ── adjustStock ────────────────────────────────────────────────────────

export async function adjustStock(formData: FormData): Promise<ActionResult> {
  const actorId = await getActorId();

  const parsed = adjustSchema.safeParse({
    itemId: formData.get('itemId'),
    delta: formData.get('delta'),
    type: formData.get('type'),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { itemId, delta, type } = parsed.data;

  await db.transaction(async (tx) => {
    // Guard: don't let quantity go below 0
    const [item] = await tx
      .select({ quantity: inventoryItems.quantity })
      .from(inventoryItems)
      .where(eq(inventoryItems.id, itemId))
      .limit(1);

    if (!item) throw new Error('Item not found.');
    if (item.quantity + delta < 0) throw new Error('Stock cannot go below zero.');

    await tx
      .update(inventoryItems)
      .set({ quantity: item.quantity + delta })
      .where(eq(inventoryItems.id, itemId));

    await tx.insert(stockLedger).values({
      itemId,
      delta,
      type,
      staffId: actorId,
    });
  });

  await logActivity({
    actorId,
    action: 'adjust_stock',
    entityType: 'inventory_item',
    entityId: itemId,
    summary: { delta, type },
  });

  revalidatePath('/admin/inventory');
  revalidatePath(`/admin/inventory/${itemId}`);
  return { ok: true, data: undefined };
}
