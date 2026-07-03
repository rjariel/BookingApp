'use client';

import { useState, useTransition } from 'react';
import { updateBookingStatus } from '../actions';

type Props = {
  bookingId: string;
  currentStatus: string;
  /** Amount still owed on the booking. Blocks marking as completed when > 0. */
  balanceDue?: number;
};

const transitions: Record<
  string,
  { to: string; label: string; variant: 'primary' | 'danger' | 'ghost' }[]
> = {
  pending: [
    { to: 'confirmed', label: 'Confirm', variant: 'primary' },
    { to: 'cancelled', label: 'Cancel', variant: 'danger' },
  ],
  confirmed: [
    { to: 'completed', label: 'Mark completed', variant: 'primary' },
    { to: 'no_show', label: 'No-show', variant: 'ghost' },
    { to: 'cancelled', label: 'Cancel', variant: 'danger' },
  ],
};

const variantCls = {
  primary: 'bg-zinc-900 text-white hover:opacity-80 dark:bg-zinc-100 dark:text-zinc-900',
  danger: 'bg-red-600 text-white hover:opacity-80',
  ghost:
    'border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800',
};

export default function StatusTransitionButton({
  bookingId,
  currentStatus,
  balanceDue = 0,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const available = transitions[currentStatus];

  if (!available?.length) return null;

  const hasBalance = balanceDue > 0;

  function handleClick(to: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateBookingStatus(bookingId, to);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        {available.map((t) => {
          const blocked = t.to === 'completed' && hasBalance;
          return (
            <button
              type="button"
              key={t.to}
              onClick={() => handleClick(t.to)}
              disabled={isPending || blocked}
              title={
                blocked ? `Balance of ₱${balanceDue.toFixed(2)} must be paid first` : undefined
              }
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${variantCls[t.variant]}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
