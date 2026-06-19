'use client';

import { useTransition } from 'react';
import type { ActionResult } from '../actions';

type Props = {
  id: string;
  active: boolean;
  toggleActive: (id: string, active: boolean) => Promise<ActionResult>;
};

export default function ToggleActiveButton({ id, active, toggleActive }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleActive(id, !active);
        })
      }
      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        active
          ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20'
          : 'border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/20'
      }`}
    >
      {pending ? '…' : active ? 'Deactivate item' : 'Activate item'}
    </button>
  );
}
