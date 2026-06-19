'use client';

import { useActionState, useEffect, useState } from 'react';
import type { ActionResult } from '../actions';

type ExpenseType = { id: string; name: string; isInventoryPurchase: boolean };
type PaymentMode = { id: string; name: string };
type InventoryItem = { id: string; name: string };

type Props = {
  action: (formData: FormData) => Promise<ActionResult>;
  expenseTypes: ExpenseType[];
  paymentModes: PaymentMode[];
  inventoryItems: InventoryItem[];
  submitLabel?: string;
};

const initialState: ActionResult | null = null;

const inputCls =
  'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

const selectCls =
  'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

export default function ExpenseForm({
  action,
  expenseTypes,
  paymentModes,
  inventoryItems,
  submitLabel = 'Save',
}: Props) {
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [isInventory, setIsInventory] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, fd: FormData) => action(fd),
    initialState,
  );

  useEffect(() => {
    const type = expenseTypes.find((t) => t.id === selectedTypeId);
    setIsInventory(type?.isInventoryPurchase ?? false);
  }, [selectedTypeId, expenseTypes]);

  // Default date = today in local YYYY-MM-DD
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

  return (
    <form action={formAction} className="space-y-4 max-w-sm">
      {state && !state.ok && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {state.error}
        </p>
      )}

      <label className="block">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Expense type *
        </span>
        <select
          name="expenseTypeId"
          required
          value={selectedTypeId}
          onChange={(e) => setSelectedTypeId(e.target.value)}
          className={selectCls}
        >
          <option value="">Select type…</option>
          {expenseTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.isInventoryPurchase ? ' (inventory)' : ''}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Amount (₱) *
        </span>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="0.00"
          className={inputCls}
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Payment method
        </span>
        <select name="paymentModeId" className={selectCls}>
          <option value="">— unspecified —</option>
          {paymentModes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Date *
        </span>
        <input name="spentOn" type="date" required defaultValue={todayStr} className={inputCls} />
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Description
        </span>
        <textarea
          name="description"
          rows={3}
          maxLength={2000}
          placeholder="Optional notes…"
          className={inputCls}
        />
      </label>

      {/* Inventory fields — shown only when the selected type is_inventory_purchase */}
      {isInventory && (
        <div className="rounded-md border border-violet-200 bg-violet-50 p-4 space-y-3 dark:border-violet-800 dark:bg-violet-950/20">
          <p className="text-xs font-medium text-violet-700 dark:text-violet-400">
            Inventory restock — selecting an item and quantity will update stock automatically.
          </p>

          <label className="block">
            <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Inventory item *
            </span>
            <select name="inventoryItemId" required={isInventory} className={selectCls}>
              <option value="">Select item…</option>
              {inventoryItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Quantity *
            </span>
            <input
              name="qty"
              type="number"
              min="1"
              step="1"
              required={isInventory}
              placeholder="0"
              className={inputCls}
            />
          </label>
        </div>
      )}

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
