import 'server-only';
import { db } from '@/db';
import { storeSettings } from '@/db/schema';

export const STORE_HOURS_DEFAULT = { openTime: '09:00', closeTime: '18:00' } as const;

export type StoreHours = { openTime: string; closeTime: string };
export type StudioProfile = { studioName: string; logoUrl: string | null };

/** Parse "HH:MM" → integer hour (e.g. "09:30" → 9, "18:00" → 18). */
export function parseHour(hhmm: string): number {
  return parseInt(hhmm.split(':')[0] ?? '0', 10);
}

/** Parse "HH:MM" → fractional hour (e.g. "09:30" → 9.5). */
export function parseHourFractional(hhmm: string): number {
  const [h = '0', m = '0'] = hhmm.split(':');
  return parseInt(h, 10) + parseInt(m, 10) / 60;
}

/**
 * Fetches the single store_settings row. Falls back to defaults if the
 * table is empty (e.g. before first save or before migration runs).
 */
export async function getStoreHours(): Promise<StoreHours> {
  try {
    const [row] = await db.select().from(storeSettings).limit(1);
    if (!row) return STORE_HOURS_DEFAULT;
    return { openTime: row.openTime, closeTime: row.closeTime };
  } catch {
    return STORE_HOURS_DEFAULT;
  }
}

export async function getStudioProfile(): Promise<StudioProfile> {
  try {
    const [row] = await db.select().from(storeSettings).limit(1);
    if (!row) return { studioName: 'My Studio', logoUrl: null };
    return { studioName: row.studioName, logoUrl: row.logoUrl ?? null };
  } catch {
    return { studioName: 'My Studio', logoUrl: null };
  }
}
