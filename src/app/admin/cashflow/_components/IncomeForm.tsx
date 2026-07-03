'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createIncomeEntry } from '../actions';

const initialState = { ok: false as boolean | undefined, error: undefined as string | undefined };

export default function IncomeForm({ defaultDate }: { defaultDate: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await createIncomeEntry(formData);
      return { ok: result.ok, error: result.ok ? undefined : result.error };
    },
    initialState,
  );

  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="income-date"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
          >
            Date
          </label>
          <input
            id="income-date"
            name="date"
            type="date"
            defaultValue={defaultDate}
            required
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
          />
        </div>
        <div>
          <label
            htmlFor="income-amount"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
          >
            Amount (₱)
          </label>
          <input
            id="income-amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            required
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="income-source"
          className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
        >
          Source
        </label>
        <input
          id="income-source"
          name="source"
          type="text"
          placeholder="e.g. Booking payment — Jane Doe, Walk-in print"
          required
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
        />
      </div>

      <div>
        <label
          htmlFor="income-notes"
          className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
        >
          Notes <span className="text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="income-notes"
          name="notes"
          rows={2}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
        />
      </div>

      {state.error && <p className="text-xs text-red-500">{state.error}</p>}
      {state.ok && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">Income recorded.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? 'Saving…' : 'Record income'}
      </button>
    </form>
  );
}
