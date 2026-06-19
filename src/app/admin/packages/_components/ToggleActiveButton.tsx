'use client';

import { useTransition } from 'react';
import { togglePackageActive } from '../actions';

export default function ToggleActiveButton({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(() => {
          void togglePackageActive(id, !active);
        })
      }
      className={`rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        active
          ? 'border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30'
          : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
      }`}
    >
      {pending ? 'Saving…' : active ? 'Deactivate' : 'Activate'}
    </button>
  );
}
