'use client';

import { useActionState } from 'react';
import { toggleUserActive } from '../actions';

type Props = { userId: string; active: boolean; name: string };

export function ToggleActiveButton({ userId, active, name }: Props) {
  const [state, action, pending] = useActionState(toggleUserActive, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={pending}
        className={`rounded-md border px-2.5 py-1 text-xs transition-colors disabled:opacity-50 ${
          active
            ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950'
            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950'
        }`}
      >
        {pending ? '…' : active ? 'Deactivate' : 'Activate'}
      </button>
      {state?.error && <span className="ml-2 text-xs text-red-500">{state.error}</span>}
    </form>
  );
}
