'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/db';
import { cashIncome, cashReports, cashWithdrawals } from '@/db/schema';
import { logActivity } from '@/lib/activity-log';

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function getActor() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, role: session.user.role ?? 'staff' };
}

// ── Submit EOD cash report (staff + admin) ─────────────────────────────
const cashReportSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amountReported: z.coerce.number().min(0, 'Amount must be 0 or greater'),
  notes: z.string().max(1000).optional(),
});

export async function submitCashReport(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: 'Not authenticated.' };

  const raw = cashReportSchema.safeParse({
    date: formData.get('date'),
    amountReported: formData.get('amountReported'),
    notes: formData.get('notes') || undefined,
  });
  if (!raw.success) return { ok: false, error: raw.error.issues[0]?.message ?? 'Invalid input.' };

  const { date, amountReported, notes } = raw.data;

  // Check if a report already exists for this staff + date
  const [existing] = await db
    .select({ id: cashReports.id })
    .from(cashReports)
    .where(and(eq(cashReports.staffId, actor.id), eq(cashReports.date, date)))
    .limit(1);

  let reportId: string;

  if (existing) {
    // Update existing report
    await db
      .update(cashReports)
      .set({ amountReported: String(amountReported), notes: notes ?? null })
      .where(eq(cashReports.id, existing.id));
    reportId = existing.id;
  } else {
    const [row] = await db
      .insert(cashReports)
      .values({
        date,
        staffId: actor.id,
        amountReported: String(amountReported),
        notes: notes ?? null,
      })
      .returning({ id: cashReports.id });
    if (!row) return { ok: false, error: 'Failed to save report.' };
    reportId = row.id;
  }

  await logActivity({
    actorId: actor.id,
    action: existing ? 'update' : 'create',
    entityType: 'cash_report',
    entityId: reportId,
    summary: { date, amountReported },
  });

  revalidatePath('/admin/cashflow');
  return { ok: true, data: { id: reportId } };
}

// ── Record a withdrawal (admin only) ──────────────────────────────────
const withdrawalSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  reason: z.string().min(1, 'Reason is required').max(500),
  notes: z.string().max(1000).optional(),
});

export async function createWithdrawal(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const actor = await getActor();
  if (actor?.role !== 'admin') return { ok: false, error: 'Admin access required.' };

  const raw = withdrawalSchema.safeParse({
    date: formData.get('date'),
    amount: formData.get('amount'),
    reason: formData.get('reason'),
    notes: formData.get('notes') || undefined,
  });
  if (!raw.success) return { ok: false, error: raw.error.issues[0]?.message ?? 'Invalid input.' };

  const { date, amount, reason, notes } = raw.data;

  const [row] = await db
    .insert(cashWithdrawals)
    .values({
      date,
      amount: String(amount),
      withdrawnBy: actor.id,
      reason,
      notes: notes ?? null,
    })
    .returning({ id: cashWithdrawals.id });

  if (!row) return { ok: false, error: 'Failed to record withdrawal.' };

  await logActivity({
    actorId: actor.id,
    action: 'create',
    entityType: 'cash_withdrawal',
    entityId: row.id,
    summary: { date, amount, reason },
  });

  revalidatePath('/admin/cashflow');
  return { ok: true, data: { id: row.id } };
}

// ── Record cash income (staff + admin) ─────────────────────────────────
const incomeSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  source: z.string().min(1, 'Source is required').max(500),
  notes: z.string().max(1000).optional(),
});

export async function createIncomeEntry(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: 'Not authenticated.' };

  const raw = incomeSchema.safeParse({
    date: formData.get('date'),
    amount: formData.get('amount'),
    source: formData.get('source'),
    notes: formData.get('notes') || undefined,
  });
  if (!raw.success) return { ok: false, error: raw.error.issues[0]?.message ?? 'Invalid input.' };

  const { date, amount, source, notes } = raw.data;

  const [row] = await db
    .insert(cashIncome)
    .values({
      date,
      amount: String(amount),
      source,
      recordedBy: actor.id,
      notes: notes ?? null,
    })
    .returning({ id: cashIncome.id });

  if (!row) return { ok: false, error: 'Failed to record income.' };

  await logActivity({
    actorId: actor.id,
    action: 'create',
    entityType: 'cash_income',
    entityId: row.id,
    summary: { date, amount, source },
  });

  revalidatePath('/admin/cashflow');
  return { ok: true, data: { id: row.id } };
}
