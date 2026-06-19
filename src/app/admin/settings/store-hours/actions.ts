'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { storeSettings } from '@/db/schema';
import { logActivity } from '@/lib/activity-log';
import { requireAdmin } from '@/lib/auth-utils';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z
  .object({
    openTime: z.string().regex(timeRegex, 'Must be HH:MM (24h)'),
    closeTime: z.string().regex(timeRegex, 'Must be HH:MM (24h)'),
  })
  .refine((d) => d.openTime < d.closeTime, {
    message: 'Close time must be after open time.',
    path: ['closeTime'],
  });

export async function saveStoreHours(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string; fieldErrors?: Record<string, string[]> }> {
  const actorId = await requireAdmin();

  const parsed = schema.safeParse({
    openTime: formData.get('openTime'),
    closeTime: formData.get('closeTime'),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    const formError = parsed.error.flatten().formErrors[0];
    return { error: formError, fieldErrors };
  }

  const { openTime, closeTime } = parsed.data;

  // Upsert — delete all rows then insert one (simpler than ON CONFLICT with no unique key).
  const existing = await db.select().from(storeSettings).limit(1);

  if (existing.length > 0 && existing[0]) {
    const { eq } = await import('drizzle-orm');
    await db
      .update(storeSettings)
      .set({ openTime, closeTime })
      .where(eq(storeSettings.id, existing[0].id));
  } else {
    await db.insert(storeSettings).values({ openTime, closeTime });
  }

  await logActivity({
    actorId,
    action: 'update_store_hours',
    entityType: 'store_settings',
    summary: { openTime, closeTime },
  });

  revalidatePath('/admin/settings/store-hours');
  revalidatePath('/admin'); // refresh dashboard available slots
  return {};
}
