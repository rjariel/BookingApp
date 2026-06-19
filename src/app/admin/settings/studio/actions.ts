'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { storeSettings } from '@/db/schema';
import { logActivity } from '@/lib/activity-log';
import { requireAdmin } from '@/lib/auth-utils';

const MAX_LOGO_BYTES = 500_000; // 500 KB base64 limit

const schema = z.object({
  studioName: z.string().min(1, 'Studio name is required').max(100),
  logoUrl: z
    .string()
    .max(MAX_LOGO_BYTES * 2, 'Logo file is too large (max 500 KB)')
    .optional(),
  removeLogo: z.coerce.boolean().optional(),
});

export type StudioFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  ok?: boolean;
};

export async function saveStudioProfile(
  _: StudioFormState | undefined,
  formData: FormData,
): Promise<StudioFormState | undefined> {
  const actorId = await requireAdmin();

  const parsed = schema.safeParse({
    studioName: formData.get('studioName'),
    logoUrl: formData.get('logoUrl') || undefined,
    removeLogo: formData.get('removeLogo') === 'true',
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { studioName, logoUrl, removeLogo } = parsed.data;

  // Determine final logo value
  const logoValue = removeLogo ? null : (logoUrl ?? undefined);

  const existing = await db.select().from(storeSettings).limit(1);

  if (existing.length > 0 && existing[0]) {
    await db
      .update(storeSettings)
      .set({
        studioName,
        ...(logoValue !== undefined ? { logoUrl: logoValue } : {}),
      })
      .where(eq(storeSettings.id, existing[0].id));
  } else {
    await db.insert(storeSettings).values({
      studioName,
      logoUrl: logoValue ?? null,
    });
  }

  await logActivity({
    actorId,
    action: 'update_studio_profile',
    entityType: 'store_settings',
    summary: { studioName, logoChanged: !!logoUrl || !!removeLogo },
  });

  revalidatePath('/admin/settings/studio');
  revalidatePath('/admin');
  return { ok: true };
}
