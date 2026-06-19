'use client';

import { useActionState } from 'react';
import type { ActionResult } from '../actions';

type Props = {
  itemId: string;
  adjustStock: (formData: FormData) => Promise<ActionResult>;
};

const initialState: ActionResult | null = null;

export default function AdjustStockForm({ itemId, adjustStock }: Props) {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => adjustStock(formData),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="itemId" value={itemId} />

      {state && !state.ok && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">
          Stock updated.
        </p>
      )}

      <div className="flex gap-3">
        <label className="flex-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Delta (±)</span>
          <input
            name="delta"
            type="number"
            placeholder="e.g. 10 or -3"
            required
            className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>

        <label className="w-36">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Type</span>
          <select
            name="type"
            className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="restock">Restock</option>
            <option value="adjustment">Adjustment</option>
            <option value="wastage">Wastage</option>
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {pending ? 'Adjusting…' : 'Adjust stock'}
      </button>
    </form>
  );
}
