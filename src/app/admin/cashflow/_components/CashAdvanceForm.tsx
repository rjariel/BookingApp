'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createCashAdvanceEntry } from '../actions';

const initialState = { ok: false as boolean | undefined, error: undefined as string | undefined };

export default function CashAdvanceForm({
  defaultDate,
  staffOptions,
}: {
  defaultDate: string;
  staffOptions: { id: string; name: string | null; email: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await createCashAdvanceEntry(formData);
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
            htmlFor="advance-staff"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
          >
            Staff
          </label>
          <select
            id="advance-staff"
            name="staffId"
            required
            defaultValue=""
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
          >
            <option value="" disabled>
              Select…
            </option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name ?? s.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="advance-type"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
          >
            Type
          </label>
          <select
            id="advance-type"
            name="type"
            required
            defaultValue="advance"
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
          >
            <option value="advance">Advance given</option>
            <option value="repayment">Repayment received</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="advance-date"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
          >
            Date
          </label>
          <input
            id="advance-date"
            name="date"
            type="date"
            defaultValue={defaultDate}
            required
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
          />
        </div>
        <div>
          <label
            htmlFor="advance-amount"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
          >
            Amount (₱)
          </label>
          <input
            id="advance-amount"
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
          htmlFor="advance-reason"
          className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
        >
          Reason <span className="text-zinc-400">(optional)</span>
        </label>
        <input
          id="advance-reason"
          name="reason"
          type="text"
          placeholder="e.g. Emergency, Claimed early"
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
        />
      </div>

      <div>
        <label
          htmlFor="advance-notes"
          className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
        >
          Notes <span className="text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="advance-notes"
          name="notes"
          rows={2}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
        />
      </div>

      {state.error && <p className="text-xs text-red-500">{state.error}</p>}
      {state.ok && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">Entry recorded.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {pending ? 'Saving…' : 'Record entry'}
      </button>
    </form>
  );
}
