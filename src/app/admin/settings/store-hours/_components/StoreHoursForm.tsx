'use client';

import { useActionState } from 'react';
import { saveStoreHours } from '../actions';

type Props = { openTime: string; closeTime: string };

export function StoreHoursForm({ openTime, closeTime }: Props) {
  const [state, action, pending] = useActionState(saveStoreHours, undefined);
  const saved = !state?.error && !state?.fieldErrors && state !== undefined;

  return (
    <form action={action} className="space-y-5">
      <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-700">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="openTime"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Open time
            </label>
            <input
              id="openTime"
              name="openTime"
              type="time"
              defaultValue={openTime}
              required
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
            {state?.fieldErrors?.openTime && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {state.fieldErrors.openTime[0]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="closeTime"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Close time
            </label>
            <input
              id="closeTime"
              name="closeTime"
              type="time"
              defaultValue={closeTime}
              required
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
            {state?.fieldErrors?.closeTime && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {state.fieldErrors.closeTime[0]}
              </p>
            )}
          </div>
        </div>

        {state?.error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{state.error}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? 'Saving…' : 'Save hours'}
        </button>
        {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved ✓</span>}
      </div>
    </form>
  );
}
