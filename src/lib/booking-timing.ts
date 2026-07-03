import { phDateStr } from './timezone';

/**
 * "Advance booking" classification — a purely computed, display-only signal.
 * Not stored on the row and not part of `booking_status`; recomputed on read
 * from `startsAt` vs "today" (PH calendar date), so it updates automatically
 * as the event date approaches.
 */

/**
 * True when the event's PH calendar date is tomorrow or later relative to
 * `now`'s PH calendar date — i.e. not a booking scheduled for today.
 */
export function isAdvanceBooking(startsAt: Date, now: Date = new Date()): boolean {
  return phDateStr(startsAt) > phDateStr(now);
}
