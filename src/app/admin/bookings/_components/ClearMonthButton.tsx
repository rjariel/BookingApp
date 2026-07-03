'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { clearBookingsForMonth } from '../actions';

type Props = {
  month: string;
  monthLabel: string;
  count: number;
};

export default function ClearMonthButton({ month, monthLabel, count }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    const confirmed = window.confirm(
      `Clear all ${count} booking${count === 1 ? '' : 's'} in ${monthLabel}?\n\n` +
        'This permanently deletes them and releases any reserved inventory back to stock. ' +
        'This cannot be undone.',
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await clearBookingsForMonth(month);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || count === 0}
        className="whitespace-nowrap rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
      >
        {isPending ? 'Clearing…' : `Clear all bookings (${monthLabel})`}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
