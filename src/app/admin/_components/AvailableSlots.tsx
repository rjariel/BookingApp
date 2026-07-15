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
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="font-normal">
          ({storeHours.openTime} – {storeHours.closeTime})
        </span>
      </p>

      {slots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-100/50 py-6 text-center dark:border-zinc-700 dark:bg-zinc-800/30">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No open slots remaining today.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {slots.map((slot) => (
            <span
              key={slot.start.getTime()}
              className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            >
              {fmtTime.format(slot.start)} – {fmtTime.format(slot.end)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
