'use client';

import { useTransition } from 'react';
import { toggleInventoryPurchaseFlag } from '../actions';

export default function ToggleInventoryButton({
  id,
  isInventoryPurchase,
}: {
  id: string;
  isInventoryPurchase: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(() => void toggleInventoryPurchaseFlag(id, !isInventoryPurchase))
      }
      disabled={pending}
      title={
        isInventoryPurchase
          ? 'Inventory purchase (click to toggle)'
          : 'Not inventory (click to toggle)'
      }
      className={`rounded-md px-2.5 py-1 text-xs transition-colors disabled:opacity-50 ${
        isInventoryPurchase
          ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400'
          : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
      }`}
    >
      {isInventoryPurchase ? 'Inventory' : 'Non-inventory'}
    </button>
  );
}
