/**
 * Pure availability logic — no DB, no side effects.
 * Computes free time slots within a working window given a list of bookings.
 */

export type TimeRange = { start: Date; end: Date };

export type BookingSlot = {
  startsAt: Date;
  endsAt: Date;
};

export type WindowHours = {
  /** Fractional hour for window open, e.g. 9 = 09:00, 9.5 = 09:30 */
  openHour: number;
  /** Fractional hour for window close, e.g. 18 = 18:00 */
  closeHour: number;
};

const DEFAULT_HOURS: WindowHours = { openHour: 9, closeHour: 18 };
const MIN_GAP_MIN = 15; // gaps < 15 min are not shown

/**
 * Returns free time ranges within the working window after subtracting bookings.
 *
 * @param date     The start-of-day instant (midnight) of the business day to compute
 *                 slots for — e.g. `phDayBounds().start`. Must be an absolute instant,
 *                 not read via local Date getters: the window is built by adding
 *                 fractional hours as milliseconds, so this is correct regardless of
 *                 the server process's configured timezone.
 * @param bookings Non-cancelled bookings for that date, any order.
 * @param hours    Open/close hours from store settings (defaults to 09:00–18:00).
 * @param now      Current instant, if known. When provided, the window start is
 *                 clipped forward to `now` so slots that have already elapsed
 *                 today are not reported as free. Omit for past/future dates.
 */
export function computeFreeSlots(
  date: Date,
  bookings: BookingSlot[],
  hours: WindowHours = DEFAULT_HOURS,
  now?: Date,
): TimeRange[] {
  const dayStartMs = date.getTime();

  const rawWindowStart = new Date(dayStartMs + hours.openHour * 3_600_000);
  const windowEnd = new Date(dayStartMs + hours.closeHour * 3_600_000);
  const windowStart = now && now > rawWindowStart ? now : rawWindowStart;

  if (windowStart >= windowEnd) return [];

  // Sort bookings by start time.
  const sorted = [...bookings].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const free: TimeRange[] = [];
  let cursor = windowStart;

  for (const booking of sorted) {
    const bStart = booking.startsAt > cursor ? booking.startsAt : cursor;
    // Clip booking to window.
    const bEnd = booking.endsAt < windowEnd ? booking.endsAt : windowEnd;

    if (bStart > cursor) {
      // There's a gap before this booking.
      const gapMin = (bStart.getTime() - cursor.getTime()) / 60_000;
      if (gapMin >= MIN_GAP_MIN) {
        free.push({ start: cursor, end: bStart });
      }
    }

    if (bEnd > cursor) cursor = bEnd;
    if (cursor >= windowEnd) break;
  }

  // Trailing gap after the last booking.
  if (cursor < windowEnd) {
    const gapMin = (windowEnd.getTime() - cursor.getTime()) / 60_000;
    if (gapMin >= MIN_GAP_MIN) {
      free.push({ start: cursor, end: windowEnd });
    }
  }

  return free;
}
