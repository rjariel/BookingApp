'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createWithdrawal } from '../actions';

const initialState = { ok: false as boolean | undefined, error: undefined as string | undefined };

export default function WithdrawalForm({ defaultDate }: { defaultDate: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await createWithdrawal(formData);
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
            htmlFor="withdrawal-date"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
          >
            Date
          </label>
          <input
            id="withdrawal-date"
            name="date"
            type="date"
            defaultValue={defaultDate}
            required
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
          />
        </div>
        <div>
          <label
            htmlFor="withdrawal-amount"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
          >
            Amount (₱)
          </label>
          <input
            id="withdrawal-amount"
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
          htmlFor="withdrawal-reason"
          className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
        >
          Reason
        </label>
        <input
          id="withdrawal-reason"
          name="reason"
          type="text"
          placeholder="e.g. Bank deposit, Owner withdrawal"
          required
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
        />
      </div>

      <div>
        <label
          htmlFor="withdrawal-notes"
          className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
        >
          Notes <span className="text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="withdrawal-notes"
          name="notes"
          rows={2}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
        />
      </div>

      {state.error && <p className="text-xs text-red-500">{state.error}</p>}
      {state.ok && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">Withdrawal recorded.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {pending ? 'Saving…' : 'Record withdrawal'}
      </button>
    </form>
  );
}
