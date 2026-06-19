'use client';

import { useActionState, useState } from 'react';
import type { Addon } from '@/db/schema';
import {
  createCustomAddon,
  deleteCustomAddon,
  linkGlobalAddon,
  unlinkGlobalAddon,
} from '../actions';

type Props = {
  packageId: string;
  globalAddons: (Addon & { isLinked: boolean })[];
  customAddons: Addon[];
};

export default function PackageAddonsManager({ packageId, globalAddons, customAddons }: Props) {
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [linking, setLinking] = useState<string | null>(null);

  type State = { ok: boolean; error?: string } | null;
  const [customState, customAction, customPending] = useActionState(
    async (_prev: State, _formData: FormData): Promise<State> => {
      if (!customName || !customPrice) {
        return { ok: false, error: 'Name and price are required.' };
      }
      const formData = new FormData();
      formData.append('name', customName);
      formData.append('price', customPrice);
      const result = await createCustomAddon(packageId, formData);
      if (result.ok) {
        setCustomName('');
        setCustomPrice('');
        return { ok: true };
      }
      return { ok: false, error: result.error };
    },
    null as State,
  );

  const _availableGlobalAddons = globalAddons.filter((a) => !a.isLinked);
  const _linkedGlobalAddons = globalAddons.filter((a) => a.isLinked);

  return (
    <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add-ons</h2>

      {/* Global add-ons with checkboxes */}
      <div className="mb-6">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
          Global Add-ons
        </h3>
        {globalAddons.length > 0 ? (
          <div className="space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
            {globalAddons.map((addon) => (
              <label
                key={addon.id}
                className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900/50"
              >
                <input
                  type="checkbox"
                  checked={addon.isLinked}
                  onChange={async (e) => {
                    setLinking(addon.id);
                    if (e.target.checked) {
                      await linkGlobalAddon(packageId, addon.id);
                    } else {
                      await unlinkGlobalAddon(packageId, addon.id);
                    }
                    setLinking(null);
                  }}
                  disabled={linking === addon.id}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-600"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {addon.name}
                  </p>
                  <p className="text-xs text-zinc-500">₱{parseFloat(addon.price).toFixed(2)}</p>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">No global add-ons available.</p>
        )}
      </div>

      {/* Custom add-ons */}
      <div className="mb-6">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
          Custom Add-ons
        </h3>
        {customAddons.length > 0 ? (
          <div className="space-y-2">
            {customAddons.map((addon) => (
              <div
                key={addon.id}
                className="flex items-center justify-between rounded-md border border-zinc-200 bg-green-50 p-3 dark:border-zinc-700 dark:bg-green-950/20"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {addon.name}
                  </p>
                  <p className="text-xs text-zinc-500">₱{parseFloat(addon.price).toFixed(2)}</p>
                </div>
                <button
                  onClick={async () => {
                    if (
                      confirm(
                        'Are you sure? This will delete the custom add-on and remove it from any bookings.',
                      )
                    ) {
                      await deleteCustomAddon(packageId, addon.id);
                    }
                  }}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">No custom add-ons yet.</p>
        )}
      </div>

      {/* Create custom add-on form */}
      <form action={customAction} className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
        {customState && !customState.ok && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
            {customState.error}
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Add-on Name
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.currentTarget.value)}
              placeholder="e.g. Premium Nails"
              className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Price (₱)
            </label>
            <input
              type="text"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.currentTarget.value)}
              placeholder="0.00"
              className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <button
            type="submit"
            disabled={customPending || !customName || !customPrice}
            className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {customPending ? 'Creating…' : 'Create Custom Add-on'}
          </button>
        </div>
      </form>
    </div>
  );
}
