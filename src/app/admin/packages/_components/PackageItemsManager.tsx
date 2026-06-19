'use client';

import { useActionState, useState } from 'react';
import type { inventoryItems } from '@/db/schema';
import { addPackageItem, removePackageItem, updatePackageItem } from '../actions';

type InventoryItem = typeof inventoryItems.$inferSelect;

type PackageItemWithDetails = {
  itemId: string;
  qty: number;
  name: string;
  price: string;
};

type Props = {
  packageId: string;
  items: PackageItemWithDetails[];
  allInventoryItems: InventoryItem[];
};

export default function PackageItemsManager({ packageId, items, allInventoryItems }: Props) {
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('1');

  type State = { ok: boolean; error?: string } | null;
  const [addState, addAction, addPending] = useActionState(
    async (_prev: State, _formData: FormData): Promise<State> => {
      if (!itemId || !qty || parseInt(qty, 10) < 1) {
        return { ok: false, error: 'Please select an item and enter a valid quantity.' };
      }
      const result = await addPackageItem(packageId, itemId, parseInt(qty, 10));
      if (result.ok) {
        setItemId('');
        setQty('1');
        return { ok: true };
      }
      return { ok: false, error: result.error };
    },
    null as State,
  );

  const availableItems = allInventoryItems.filter(
    (inv) => !items.some((pi) => pi.itemId === inv.id),
  );

  return (
    <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Included Items
      </h2>

      {/* Current items */}
      {items.length > 0 ? (
        <div className="mb-6 space-y-2">
          {items.map((item) => (
            <div
              key={item.itemId}
              className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.name}</p>
                <p className="text-xs text-zinc-500">
                  Qty: {item.qty} · Price: ₱{parseFloat(item.price).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={item.qty}
                  onChange={async (e) => {
                    const newQty = parseInt(e.currentTarget.value, 10);
                    if (newQty >= 1) {
                      await updatePackageItem(packageId, item.itemId, newQty);
                    }
                  }}
                  className="w-12 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                />
                <button
                  onClick={async () => {
                    await removePackageItem(packageId, item.itemId);
                  }}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-6 text-sm text-zinc-500">No items added yet.</p>
      )}

      {/* Add item form */}
      <form
        action={addAction}
        className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700"
      >
        {addState && !addState.ok && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
            {addState.error}
          </p>
        )}

        <div className="flex gap-3">
          <select
            value={itemId}
            onChange={(e) => setItemId(e.currentTarget.value)}
            className="flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">Select an item…</option>
            {availableItems.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.name} (₱{parseFloat(inv.price).toFixed(2)})
              </option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.currentTarget.value)}
            className="w-20 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="Qty"
          />

          <button
            type="submit"
            disabled={addPending || !itemId}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {addPending ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>

      {availableItems.length === 0 && items.length > 0 && (
        <p className="mt-2 text-xs text-zinc-500">All inventory items are already added.</p>
      )}
    </div>
  );
}
