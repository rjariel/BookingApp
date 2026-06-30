'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/db';
import { expenseTypes } from '@/db/schema';
import { logActivity } from '@/lib/activity-log';

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function getActorId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

const typeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  isInventoryPurchase: z.boolean().default(false),
});

export async function createExpenseType(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const actorId = await getActorId();
  if (!actorId) return { ok: false, error: 'Authentication required.' };

  const raw = typeSchema.safeParse({
    name: formData.get('name'),
    isInventoryPurchase: formData.get('isInventoryPurchase') === 'true',
  });
  if (!raw.success) return { ok: false, error: raw.error.issues[0]?.message ?? 'Invalid input.' };

  const [row] = await db
    .insert(expenseTypes)
    .values({
      name: raw.data.name.trim(),
      isInventoryPurchase: raw.data.isInventoryPurchase,
    })
    .returning({ id: expenseTypes.id });

  if (!row) return { ok: false, error: 'Failed to create expense type.' };

  await logActivity({
    actorId,
    action: 'create',
    entityType: 'expense_type',
    entityId: row.id,
    summary: { name: raw.data.name, isInventoryPurchase: raw.data.isInventoryPurchase },
  });

  revalidatePath('/admin/settings/expense-types');
  return { ok: true, data: { id: row.id } };
}

export async function updateExpenseType(id: string, formData: FormData): Promise<ActionResult> {
  const actorId = await getActorId();
  if (!actorId) return { ok: false, error: 'Authentication required.' };

  const raw = typeSchema.safeParse({
    name: formData.get('name'),
    isInventoryPurchase: formData.get('isInventoryPurchase') === 'true',
  });
  if (!raw.success) return { ok: false, error: raw.error.issues[0]?.message ?? 'Invalid input.' };

  const [existing] = await db
    .select({ id: expenseTypes.id })
    .from(expenseTypes)
    .where(eq(expenseTypes.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: 'Expense type not found.' };

  await db
    .update(expenseTypes)
    .set({ name: raw.data.name.trim(), isInventoryPurchase: raw.data.isInventoryPurchase })
    .where(eq(expenseTypes.id, id));

  await logActivity({
    actorId,
    action: 'update',
    entityType: 'expense_type',
    entityId: id,
    summary: { name: raw.data.name, isInventoryPurchase: raw.data.isInventoryPurchase },
  });

  revalidatePath('/admin/settings/expense-types');
  return { ok: true, data: undefined };
}

export async function toggleExpenseType(id: string, active: boolean): Promise<ActionResult> {
  const actorId = await getActorId();
  if (!actorId) return { ok: false, error: 'Authentication required.' };

  const [existing] = await db
    .select({ id: expenseTypes.id })
    .from(expenseTypes)
    .where(eq(expenseTypes.id, id))
    .limit(1);
  if (!existing) return { ok: false, error: 'Expense type not found.' };

  await db.update(expenseTypes).set({ active }).where(eq(expenseTypes.id, id));

  await logActivity({
    actorId,
    action: active ? 'enable' : 'disable',
    entityType: 'expense_type',
    entityId: id,
  });

  revalidatePath('/admin/settings/expense-types');
  return { ok: true, data: undefined };
}

export async function toggleInventoryPurchaseFlag(
  id: string,
  isInventoryPurchase: boolean,
): Promise<ActionResult> {
  const actorId = await getActorId();
  if (!actorId) return { ok: false, error: 'Authentication required.' };

  await db.update(expenseTypes).set({ isInventoryPurchase }).where(eq(expenseTypes.id, id));

  await logActivity({
    actorId,
    action: 'update',
    entityType: 'expense_type',
    entityId: id,
    summary: { isInventoryPurchase },
  });

  revalidatePath('/admin/settings/expense-types');
  return { ok: true, data: undefined };
}
