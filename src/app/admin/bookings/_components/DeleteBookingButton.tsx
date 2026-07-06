'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteBooking } from '../actions';

type Props = {
  bookingId: string;
  clientName: string;
};

export default function DeleteBookingButton({ bookingId, clientName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    const confirmed = window.confirm(
      `Delete the booking for ${clientName || 'this client'}?\n\n` +
        'This permanently deletes it and releases any reserved inventory back to stock. ' +
        'This cannot be undone.',
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteBooking(bookingId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/admin/bookings');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
      >
        {isPending ? 'Deleting…' : 'Delete booking'}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
