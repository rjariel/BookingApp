'use client';

import { useActionState } from 'react';
import type { ActionResult } from '../actions';

type Props = {
  action: (formData: FormData) => Promise<ActionResult>;
  defaultName?: string;
  submitLabel?: string;
};

const initialState: ActionResult | null = null;

const inputCls =
  'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

export default function PaymentModeForm({ action, defaultName = '', submitLabel = 'Save' }: Props) {
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
          placeholder="e.g. GCash, Cash, Bank Transfer"
          className={inputCls}
        />
      </label>
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
