'use client';

import { useTransition } from 'react';
import { toggleExpenseType } from '../actions';

export default function ToggleActiveButton({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => void toggleExpenseType(id, !active))}
      disabled={pending}
      className={`rounded-md px-2.5 py-1 text-xs transition-colors disabled:opacity-50 ${
        active
          ? 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
      }`}
    >
      {active ? 'Disable' : 'Enable'}
    </button>
  );
}
