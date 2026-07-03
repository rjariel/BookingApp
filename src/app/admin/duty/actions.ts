'use server';

import { eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/db';
import { dailyDuty } from '@/db/schema';
import { logActivity } from '@/lib/activity-log';
import { requireModule } from '@/lib/permissions';

/**
 * Staff (or admin) submits who is on duty today.
 * Bulk-inserts one row per selected userId. Skips duplicates silently.
 */
export async function submitDutyRoster(_prev: unknown, formData: FormData) {
  const actorId = await requireModule('duty');
  const date = formData.get('date') as string;
  const userIds = formData.getAll('userIds') as string[];

  if (!date) return { error: 'Date missing.' };
  if (userIds.length === 0) return { error: 'Select at least one person.' };

  const rows = userIds.map((userId) => ({ userId, date, updatedBy: actorId }));

  await db.insert(dailyDuty).values(rows).onConflictDoNothing();

  await logActivity({
    actorId,
    action: 'create',
    entityType: 'daily_duty',
    summary: { date, count: userIds.length },
  });

  revalidatePath('/admin/duty');
  return { success: true };
}

/** Admin updates notes on a duty entry. */
export async function updateDutyNote(id: string, notes: string) {
  const session = await auth();
  if (session?.user?.role !== 'admin') return { error: 'Admin only.' };

  await db.update(dailyDuty).set({ notes, updatedBy: session.user.id }).where(eq(dailyDuty.id, id));

  revalidatePath('/admin/duty');
  return { success: true };
}

/** Admin removes one or more duty entries. */
export async function removeDutyEntries(ids: string[]) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') return { error: 'Admin only.' };

  await db.delete(dailyDuty).where(inArray(dailyDuty.id, ids));

  await logActivity({
    actorId: session.user.id,
    action: 'delete',
    entityType: 'daily_duty',
    summary: { ids },
  });

  revalidatePath('/admin/duty');
  return { success: true };
}

/** Admin adds extra staff to an already-submitted roster. */
export async function addDutyEntries(_prev: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') return { error: 'Admin only.' };

  const date = formData.get('date') as string;
  const userIds = formData.getAll('userIds') as string[];

  if (userIds.length === 0) return { error: 'Select at least one person.' };

  const rows = userIds.map((userId) => ({ userId, date, updatedBy: session.user.id }));
  await db.insert(dailyDuty).values(rows).onConflictDoNothing();

  revalidatePath('/admin/duty');
  return { success: true };
}

/**
 * Quick-edit from dashboard: replace entire roster for a date.
 * Deletes all existing entries for the date, then inserts new ones.
 */
export async function replaceDutyRoster(_prev: unknown, formData: FormData) {
  const actorId = await requireModule('duty');
  const date = formData.get('date') as string;
  const userIds = formData.getAll('userIds') as string[];

  if (!date) return { error: 'Date missing.' };

  // Delete all existing entries for this date
  await db.delete(dailyDuty).where(eq(dailyDuty.date, date));

  // Re-insert new roster
  if (userIds.length > 0) {
    const rows = userIds.map((userId) => ({ userId, date, updatedBy: actorId }));
    await db.insert(dailyDuty).values(rows);

    await logActivity({
      actorId,
      action: 'update',
      entityType: 'daily_duty',
      summary: { date, count: userIds.length },
    });
  } else {
    await logActivity({
      actorId,
      action: 'update',
      entityType: 'daily_duty',
      summary: { date, count: 0, note: 'roster cleared' },
    });
  }

  revalidatePath('/admin');
  revalidatePath('/admin/duty');
  return { success: true };
}
