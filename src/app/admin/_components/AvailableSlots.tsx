import { and, gte, lt, notInArray } from 'drizzle-orm';
import { db } from '@/db';
import { bookings } from '@/db/schema';
import { computeFreeSlots } from '@/lib/availability';
import { getStoreHours, parseHourFractional } from '@/lib/store-settings';
import { fmtPhTime, phDayBounds } from '@/lib/timezone';

const fmtTime = fmtPhTime;

const CANCELLED_STATUSES = ['cancelled'] as const;

async function getFreeSlots() {
  const { start: today, end: tomorrow } = phDayBounds();

  const [rows, storeHours] = await Promise.all([
    db
      .select({ startsAt: bookings.startsAt, endsAt: bookings.endsAt })
      .from(bookings)
      .where(
        and(
          gte(bookings.startsAt, today),
          lt(bookings.startsAt, tomorrow),
          notInArray(bookings.status, [...CANCELLED_STATUSES]),
        ),
      ),
    getStoreHours(),
  ]);

  return {
    slots: computeFreeSlots(
      today,
      rows,
      {
        openHour: parseHourFractional(storeHours.openTime),
        closeHour: parseHourFractional(storeHours.closeTime),
      },
      new Date(),
    ),
    storeHours,
  };
}

export default async function AvailableSlots() {
  const { slots, storeHours } = await getFreeSlots();

  return (
    <div>
      <p className="mb-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        {storeHours.openTime} – {storeHours.closeTime}
      </p>

      {slots.length === 0 ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">No open slots remaining today.</p>
      ) : (
        <div className="flex max-w-full flex-wrap gap-1.5">
          {slots.map((slot) => (
            <span
              key={slot.start.getTime()}
              className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 ring-inset dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800"
            >
              {fmtTime.format(slot.start)} – {fmtTime.format(slot.end)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
