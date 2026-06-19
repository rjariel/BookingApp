'use client';

import { useActionState, useState } from 'react';
import type { ActionResult } from '../actions';

type Props = {
  action: (formData: FormData) => Promise<ActionResult>;
  defaultName?: string;
  defaultIsInventoryPurchase?: boolean;
  submitLabel?: string;
};

const initialState: ActionResult | null = null;

const inputCls =
  'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

export default function ExpenseTypeForm({
  action,
  defaultName = '',
  defaultIsInventoryPurchase = false,
  submitLabel = 'Save',
}: Props) {
  const [isInventory, setIsInventory] = useState(defaultIsInventoryPurchase);

  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, fd: FormData) => action(fd),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4 max-w-sm">
      {state && !state.ok && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {state.error}
        </p>
      )}

      <label className="block">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Name *
        </span>
        <input
          name="name"
          defaultValue={defaultName}
          required
          maxLength={100}
          placeholder="e.g. Supplies, Utilities, Salary"
          className={inputCls}
        />
      </label>

      <div>
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Type
        </span>
        <input type="hidden" name="isInventoryPurchase" value={String(isInventory)} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsInventory(false)}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              !isInventory
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setIsInventory(true)}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              isInventory
                ? 'border-violet-600 bg-violet-600 text-white dark:border-violet-400 dark:bg-violet-500'
                : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Inventory purchase
          </button>
        </div>
        {isInventory && (
          <p className="mt-1.5 text-xs text-zinc-400">
            Logging this expense will restock inventory automatically.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
