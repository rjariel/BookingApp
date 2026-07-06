'use client';

import { useActionState } from 'react';
import type { ActionResult } from '../actions';

type PaymentMode = { id: string; name: string };

type Props = {
  originalId: string;
  clientName: string;
  packageName: string;
  packagePrice: string;
  durationMin: number;
  requiredDeposit: number;
  paymentModes: PaymentMode[];
  action: (formData: FormData) => Promise<ActionResult<{ id: string }>>;
};

const initialState: ActionResult<{ id: string }> | null = null;

const labelCls = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1';
const inputCls =
  'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

function fmtMoney(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function localDateTimeToUTCISO(localDT: string): string {
  return new Date(localDT).toISOString();
}

export default function RebookForm({
  clientName,
  packageName,
  packagePrice,
  durationMin,
  requiredDeposit,
  paymentModes,
  action,
}: Props) {
  const now = new Date();
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const defaultDate = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const defaultTime = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const date = formData.get('startDate') as string;
      const time = formData.get('startTime') as string;
      formData.set('startsAt', localDateTimeToUTCISO(`${date}T${time}`));
      return action(formData);
    },
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      {state && !state.ok && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            state.conflict
              ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
              : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
          }`}
        >
          {state.error}
        </div>
      )}

      {/* Original booking summary (read-only) */}
      <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/50">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Rebooking</p>
        <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{clientName}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {packageName} — {fmtMoney(parseFloat(packagePrice))} ({durationMin} min)
        </p>
      </div>

      {/* New date & time */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">New date & time</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>Date *</span>
            <input
              type="date"
              name="startDate"
              defaultValue={defaultDate}
              className={inputCls}
              required
            />
          </label>
          <label className="block">
            <span className={labelCls}>Time *</span>
            <input
              type="time"
              name="startTime"
              defaultValue={defaultTime}
              className={inputCls}
              required
            />
          </label>
        </div>
      </section>

      {/* Deposit */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Rebooking deposit
        </h2>
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/20">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Required deposit: <span className="font-semibold">{fmtMoney(requiredDeposit)}</span>{' '}
            (50% of the original package price)
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>Amount paid now (₱) *</span>
            <input
              type="number"
              name="amountPaid"
              min={requiredDeposit}
              step="0.01"
              defaultValue={requiredDeposit.toFixed(2)}
              className={inputCls}
              required
            />
          </label>
          <label className="block">
            <span className={labelCls}>Payment method *</span>
            <select name="paymentModeId" className={inputCls} required>
              <option value="" disabled>
                — select —
              </option>
              {paymentModes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Notes */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notes</h2>
        <textarea
          name="notes"
          rows={3}
          placeholder="Reason for rebooking, or other internal notes…"
          className={`${inputCls} resize-y`}
        />
      </section>

      <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? 'Rebooking…' : 'Confirm rebooking'}
        </button>
      </div>
    </form>
  );
}
