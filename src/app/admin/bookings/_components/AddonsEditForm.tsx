'use client';

import { useActionState, useState } from 'react';
import type { addons as addonsTable } from '@/db/schema';
import { updateBookingAddons } from '../actions';

type Addon = typeof addonsTable.$inferSelect;

type BookingAddon = {
  id: string;
  addonId: string;
  qty: number;
  unitPrice: string;
  addon: { id: string; name: string } | null;
};

type Props = {
  bookingId: string;
  currentAddons: BookingAddon[];
  availableAddons: Addon[];
  packagePrice: string;
  currentTotal: string;
  canEdit: boolean;
};

export default function AddonsEditForm({
  bookingId,
  currentAddons,
  availableAddons,
  packagePrice,
  canEdit,
}: Props) {
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>(
    Object.fromEntries(currentAddons.map((a) => [a.addonId, a.qty])),
  );
  const [isEditing, setIsEditing] = useState(false);

  type State = { ok: boolean; error?: string } | null;
  const [state, formAction, pending] = useActionState(
    async (_prev: State, _formData: FormData): Promise<State> => {
      const addonsJson = JSON.stringify(
        Object.entries(selectedAddons)
          .filter(([, qty]) => qty > 0)
          .map(([addonId, qty]) => ({ addonId, qty })),
      );
      const formData = new FormData();
      formData.set('addonsJson', addonsJson);
      const result = await updateBookingAddons(bookingId, formData);
      if (result.ok) {
        setIsEditing(false);
        return { ok: true };
      }
      return { ok: false, error: result.error };
    },
    null as State,
  );

  const fmtMoney = (v: string | number) =>
    `₱${parseFloat(String(v)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  // Calculate new total
  const addonTotal = availableAddons.reduce((sum, addon) => {
    const qty = selectedAddons[addon.id] ?? 0;
    return qty > 0 ? sum + parseFloat(addon.price) * qty : sum;
  }, 0);
  const newTotal = parseFloat(packagePrice) + addonTotal;

  if (!canEdit) {
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add-ons</h2>
        {currentAddons.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500 dark:border-zinc-800">
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Unit</th>
                <th className="pb-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
              {currentAddons.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 text-zinc-800 dark:text-zinc-200">{row.addon?.name}</td>
                  <td className="py-2 text-right text-zinc-600 dark:text-zinc-400">{row.qty}</td>
                  <td className="py-2 text-right text-zinc-600 dark:text-zinc-400">
                    {fmtMoney(row.unitPrice)}
                  </td>
                  <td className="py-2 text-right font-medium text-zinc-800 dark:text-zinc-200">
                    {fmtMoney(String(parseFloat(row.unitPrice) * row.qty))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-zinc-500">No add-ons</p>
        )}
      </section>
    );
  }

  if (!isEditing) {
    return (
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add-ons</h2>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Edit
          </button>
        </div>
        {currentAddons.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500 dark:border-zinc-800">
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Unit</th>
                <th className="pb-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
              {currentAddons.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 text-zinc-800 dark:text-zinc-200">{row.addon?.name}</td>
                  <td className="py-2 text-right text-zinc-600 dark:text-zinc-400">{row.qty}</td>
                  <td className="py-2 text-right text-zinc-600 dark:text-zinc-400">
                    {fmtMoney(row.unitPrice)}
                  </td>
                  <td className="py-2 text-right font-medium text-zinc-800 dark:text-zinc-200">
                    {fmtMoney(String(parseFloat(row.unitPrice) * row.qty))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-zinc-500">No add-ons</p>
        )}
      </section>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add-ons</h2>
        <span className="text-xs text-zinc-500">Editing</span>
      </div>

      {state && !state.ok && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
        {availableAddons.map((addon) => {
          const qty = selectedAddons[addon.id] ?? 0;
          const checked = qty > 0;
          return (
            <div key={addon.id} className="flex items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setSelectedAddons((prev) => ({
                      ...prev,
                      [addon.id]: e.target.checked ? 1 : 0,
                    }));
                  }}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-600"
                />
                <div className="flex-1">
                  <span className="text-sm text-zinc-800 dark:text-zinc-200">{addon.name}</span>
                  <span className="ml-2 text-xs text-zinc-400">{fmtMoney(addon.price)} each</span>
                </div>
              </label>
              {checked && (
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => {
                    const newQty = parseInt(e.currentTarget.value, 10) || 1;
                    setSelectedAddons((prev) => ({
                      ...prev,
                      [addon.id]: newQty,
                    }));
                  }}
                  className="w-12 rounded border border-zinc-300 bg-white px-2 py-1 text-center text-sm dark:border-zinc-600 dark:bg-zinc-900"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-md border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Package:</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {fmtMoney(packagePrice)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Add-ons:</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {fmtMoney(addonTotal)}
          </span>
        </div>
        <div className="border-t border-zinc-200 pt-2 dark:border-zinc-700">
          <div className="flex justify-between">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">New total:</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {fmtMoney(newTotal)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setSelectedAddons(Object.fromEntries(currentAddons.map((a) => [a.addonId, a.qty])));
          }}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
