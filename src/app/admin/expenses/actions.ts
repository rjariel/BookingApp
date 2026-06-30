'use server';

import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/db';
import { expenses, expenseTypes, inventoryItems, stockLedger } from '@/db/schema';
import { logActivity } from '@/lib/activity-log';

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function getActorId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

const expenseSchema = z.object({
  expenseTypeId: z.string().uuid('Expense type is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  paymentModeId: z.string().uuid().optional().or(z.literal('')),
  spentOn: z.string().min(1, 'Date is required'),
  description: z.string().max(2000).optional(),
  // Inventory fields — only validated when type.isInventoryPurchase
  inventoryItemId: z.string().uuid().optional().or(z.literal('')),
  qty: z.coerce.number().int().positive().optional(),
});

export async function createExpense(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const actorId = await getActorId();
  if (!actorId) return { ok: false, error: 'Authentication required.' };

  const raw = expenseSchema.safeParse({
    expenseTypeId: formData.get('expenseTypeId'),
    amount: formData.get('amount'),
    paymentModeId: formData.get('paymentModeId') || undefined,
    spentOn: formData.get('spentOn'),
    description: formData.get('description') || undefined,
    inventoryItemId: formData.get('inventoryItemId') || undefined,
    qty: formData.get('qty') || undefined,
  });
  if (!raw.success) return { ok: false, error: raw.error.issues[0]?.message ?? 'Invalid input.' };

  const d = raw.data;

  // Load the expense type to check isInventoryPurchase
  const [expType] = await db
    .select({ isInventoryPurchase: expenseTypes.isInventoryPurchase })
    .from(expenseTypes)
    .where(eq(expenseTypes.id, d.expenseTypeId))
    .limit(1);
  if (!expType) return { ok: false, error: 'Expense type not found.' };

  if (expType.isInventoryPurchase) {
    if (!d.inventoryItemId)
      return { ok: false, error: 'Inventory item is required for this expense type.' };
    if (!d.qty || d.qty < 1) return { ok: false, error: 'Quantity must be at least 1.' };
  }

  const expenseId = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(expenses)
      .values({
        expenseTypeId: d.expenseTypeId,
        amount: String(d.amount),
        paymentModeId: d.paymentModeId || null,
        spentOn: d.spentOn,
        description: d.description ?? null,
        inventoryItemId: expType.isInventoryPurchase ? (d.inventoryItemId ?? null) : null,
        qty: expType.isInventoryPurchase ? (d.qty ?? null) : null,
        recordedBy: actorId,
      })
      .returning({ id: expenses.id });

    if (!row) throw new Error('Failed to insert expense.');

    if (expType.isInventoryPurchase && d.inventoryItemId && d.qty) {
      // Write stock_ledger restock row
      await tx.insert(stockLedger).values({
        itemId: d.inventoryItemId,
        delta: d.qty,
        type: 'restock',
        expenseId: row.id,
        staffId: actorId,
      });

      // Bump inventory quantity
      await tx
        .update(inventoryItems)
        .set({ quantity: sql`${inventoryItems.quantity} + ${d.qty}` })
        .where(eq(inventoryItems.id, d.inventoryItemId));
    }

    return row.id;
  });

  await logActivity({
    actorId,
    action: 'create',
    entityType: 'expense',
    entityId: expenseId,
    summary: { amount: d.amount, spentOn: d.spentOn },
  });

  revalidatePath('/admin/expenses');
  revalidatePath('/admin');
  if (expType.isInventoryPurchase) revalidatePath('/admin/inventory');

  return { ok: true, data: { id: expenseId } };
}
