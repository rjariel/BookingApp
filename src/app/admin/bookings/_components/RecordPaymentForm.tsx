'use client';

import { useActionState, useState } from 'react';

type PaymentMode = { id: string; name: string };

type Props = {
  bookingId: string;
  amountTotal: string;
  amountPaid: string;
  paymentModeId: string | null;
  paymentModes: PaymentMode[];
  action: (formData: FormData) => Promise<{ ok: boolean; error?: string } | undefined>;
  title?: string;
  triggerLabel?: string;
  amountFieldName?: string;
  modeFieldName?: string;
  amountHelpText?: string;
};

const inputCls =
  'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

const selectCls =
  'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

type State = { ok: boolean; error?: string } | null;

export default function RecordPaymentForm({
  amountTotal,
  amountPaid,
  paymentModeId,
  paymentModes,
  action,
  title = 'Record payment',
  triggerLabel = 'Record payment',
  amountFieldName = 'amountPaid',
  modeFieldName = 'paymentModeId',
  amountHelpText = 'New cumulative total paid (₱) — enter full amount collected so far',
}: Props) {
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState(async (_prev: State, fd: FormData) => {
    const result = await action(fd);
    if (result?.ok) setOpen(false);
    return result ?? null;
  }, null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-emerald-500"
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
      <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>

      {state && !state.ok && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {state.error}
        </p>
      )}

      {/* Payment summary */}
      {(() => {
        const total = parseFloat(amountTotal);
        const paid = parseFloat(amountPaid);
        const balance = total - paid;
        const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
        return (
          <div className="mb-3 grid grid-cols-3 gap-2 rounded-md bg-zinc-100 px-3 py-2 text-xs dark:bg-zinc-800">
            <div>
              <p className="text-zinc-500">Total</p>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">{fmt(total)}</p>
            </div>
            <div>
              <p className="text-zinc-500">Collected</p>
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">{fmt(paid)}</p>
            </div>
            <div>
              <p className="text-zinc-500">Balance</p>
              <p
                className={`font-semibold ${balance > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}
              >
                {balance > 0 ? fmt(balance) : 'Paid'}
              </p>
            </div>
          </div>
        );
      })()}

      <form action={formAction} className="space-y-3">
        <label className="block">
          <span className="block text-xs font-medium text-zinc-500 mb-1">{amountHelpText}</span>
          <input
            name={amountFieldName}
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={amountPaid}
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-zinc-500 mb-1">Payment method</span>
          <select name={modeFieldName} defaultValue={paymentModeId ?? ''} className={selectCls}>
            <option value="">— unspecified —</option>
            {paymentModes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
