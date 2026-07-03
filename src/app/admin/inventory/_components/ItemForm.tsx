'use client';

import { useActionState, useId } from 'react';
import type { InventoryItem } from '@/db/schema';
import type { ActionResult } from '../actions';

type Props = {
  item?: InventoryItem;
  action: (formData: FormData) => Promise<ActionResult<unknown>>;
  submitLabel: string;
};

const initialState: ActionResult<unknown> | null = null;

export default function ItemForm({ item, action, submitLabel }: Props) {
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

      <Field label="Name" name="name" required defaultValue={item?.name} />
      <Field
        label="Price (₱)"
        name="price"
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        defaultValue={item ? String(item.price) : '0'}
      />
      <Field
        label="Description"
        name="description"
        multiline
        defaultValue={item?.description ?? ''}
      />

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Quantity"
          name="quantity"
          type="number"
          min="0"
          defaultValue={String(item?.quantity ?? 0)}
        />
        <Field
          label="Reorder level"
          name="reorderLevel"
          type="number"
          min="0"
          defaultValue={String(item?.reorderLevel ?? 0)}
        />
      </div>

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

// ── Minimal field helper ───────────────────────────────────────────────

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  multiline?: boolean;
};

function Field({ label, name, multiline, ...props }: FieldProps) {
  const id = useId();
  const base =
    'mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {multiline ? (
        <textarea
          id={id}
          name={name}
          rows={3}
          defaultValue={props.defaultValue as string}
          className={base}
        />
      ) : (
        <input id={id} name={name} className={base} {...props} />
      )}
    </label>
  );
}
