'use client';

import { useActionState, useRef, useState } from 'react';
import { setOpeningBalance } from '../actions';

interface Props {
  currentAmount: string;
  currentDate: string | null;
}

const initialState = { ok: false as boolean | undefined, error: undefined as string | undefined };

export default function OpeningBalanceForm({ currentAmount, currentDate }: Props) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await setOpeningBalance(formData);
      if (result.ok) setEditing(false);
      return { ok: result.ok, error: result.ok ? undefined : result.error };
    },
    initialState,
  );

  const formRef = useRef<HTMLFormElement>(null);

  if (!editing) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {currentDate ? (
          <span>
            Opening balance: ₱
            {parseFloat(currentAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })} as of{' '}
            {currentDate}
          </span>
        ) : (
          <span>No opening balance set — "Cash in studio" assumes ₱0 at the start.</span>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
        >
          {currentDate ? 'Edit' : 'Set it'}
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
      <div>
        <label
          htmlFor="opening-balance-amount"
          className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
        >
          Amount (₱)
        </label>
        <input
          id="opening-balance-amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          defaultValue={currentDate ? currentAmount : ''}
          placeholder="0.00"
          required
          className="w-32 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
        />
      </div>
      <div>
        <label
          htmlFor="opening-balance-date"
          className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
        >
          As of date
        </label>
        <input
          id="opening-balance-date"
          name="date"
          type="date"
          defaultValue={currentDate ?? ''}
          required
          className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        Cancel
      </button>
      {state.error && <p className="w-full text-xs text-red-500">{state.error}</p>}
    </form>
  );
}
