'use client';

import { useActionState } from 'react';
import type { addons } from '@/db/schema';
import type { ActionResult } from '../actions';

type Addon = typeof addons.$inferSelect;

type Props = {
  addon?: Addon;
  action: (formData: FormData) => Promise<ActionResult<unknown>>;
  submitLabel: string;
};

const initialState: ActionResult<unknown> | null = null;

export default function AddonForm({ addon, action, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => action(formData),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      {state && !state.ok && (
        <p className="rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {state.error}
        </p>
      )}

      <Field label="Name" name="name" required defaultValue={addon?.name} />
      <Field
        label="Price (₱)"
        name="price"
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        defaultValue={addon ? String(addon.price) : '0'}
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
};

function Field({ label, name, ...props }: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <input
        name={name}
        className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        {...props}
      />
    </label>
  );
}
