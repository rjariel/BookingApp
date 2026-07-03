/**
 * Timezone helpers for the Philippines (Asia/Manila, UTC+8 — no DST).
 *
 * `startsAt`/`endsAt`/`createdAt` are stored as `timestamptz` (UTC) per project
 * convention. Anything that displays those timestamps to staff, or buckets them
 * into "today"/"this day" for queries or grouping, must go through PH time —
 * not the server process's local timezone (which is UTC in most hosting).
 */

export const PH_TIMEZONE = 'Asia/Manila';

/** "YYYY-MM-DD" for the given instant, as a PH calendar date. */
export function phDateStr(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: PH_TIMEZONE });
}

/**
 * Midnight-to-midnight bounds of the PH calendar day containing `date`,
 * returned as absolute UTC `Date` instants suitable for `gte`/`lt` queries
 * against `timestamptz` columns.
 */
export function phDayBounds(date: Date = new Date()): { start: Date; end: Date } {
  const dateStr = phDateStr(date);
  const start = new Date(`${dateStr}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 86_400_000);
  return { start, end };
}

/** "YYYY-MM" for the given instant, as a PH calendar month. */
export function phMonthStr(date: Date = new Date()): string {
  return phDateStr(date).slice(0, 7);
}

/**
 * Midnight-to-midnight bounds of the PH calendar month "YYYY-MM" (e.g. "2026-07"),
 * returned as absolute UTC `Date` instants suitable for `gte`/`lt` queries
 * against `timestamptz` columns.
 */
export function phMonthBounds(month: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const mo = Number(monthStr);
  const start = new Date(`${month}-01T00:00:00+08:00`);
  const nextMo = mo === 12 ? 1 : mo + 1;
  const nextYear = mo === 12 ? year + 1 : year;
  const end = new Date(`${nextYear}-${String(nextMo).padStart(2, '0')}-01T00:00:00+08:00`);
  return { start, end };
}

export const fmtPhDate = new Intl.DateTimeFormat('en-PH', {
  timeZone: PH_TIMEZONE,
  dateStyle: 'medium',
});

export const fmtPhTime = new Intl.DateTimeFormat('en-PH', {
  timeZone: PH_TIMEZONE,
  hour: 'numeric',
  minute: '2-digit',
});

export const fmtPhDateTime = new Intl.DateTimeFormat('en-PH', {
  timeZone: PH_TIMEZONE,
  dateStyle: 'medium',
  timeStyle: 'short',
});
