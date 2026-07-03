import { isAdvanceBooking } from '@/lib/booking-timing';

/** Renders nothing unless the event is tomorrow (PH calendar date) or later. */
export default function AdvanceBookingPill({
  startsAt,
  className = '',
}: {
  startsAt: Date;
  className?: string;
}) {
  if (!isAdvanceBooking(startsAt)) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:ring-violet-800 ${className}`}
    >
      Advance Booking
    </span>
  );
}
