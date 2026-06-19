'use client';

import { useActionState, useEffect, useRef } from 'react';
import { submitCashReport } from '../actions';

interface Props {
  defaultDate: string;
  existingAmount?: string;
  existingNotes?: string;
}

const initialState = { ok: false as boolean | undefined, error: undefined as string | undefined };

export default function CashReportForm({ defaultDate, existingAmount, existingNotes }: Props) {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await submitCashReport(formData);
      return { ok: result.ok, error: result.ok ? undefined : result.error };
    },
    initialState,
  );

  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="date" value={defaultDate} />

      <div>
        <label
          htmlFor="amountReported"
          className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
        >
          Cash on hand (₱)
        </label>
        <input
          id="amountReported"
          name="amountReported"
          type="number"
          step="0.01"
          min="0"
          defaultValue={existingAmount ?? ''}
          placeholder="0.00"
          required
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
        />
      </div>

      <div>
        <label
          htmlFor="notes"
          className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1"
        >
          Notes <span className="text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={existingNotes ?? ''}
          placeholder="Anything to flag..."
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
        />
      </div>

      {state.error && <p className="text-xs text-red-500">{state.error}</p>}
      {state.ok && <p className="text-xs text-emerald-600 dark:text-emerald-400">Report saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? 'Saving…' : existingAmount ? 'Update report' : 'Submit EOD report'}
      </button>
    </form>
  );
}
