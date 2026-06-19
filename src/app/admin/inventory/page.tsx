import { asc } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/db';
import { inventoryItems } from '@/db/schema';
import { requireModule } from '@/lib/permissions';

export const metadata = { title: 'Inventory — BookingApp' };

export default async function InventoryPage() {
  await requireModule('inventory');
  const items = await db.select().from(inventoryItems).orderBy(asc(inventoryItems.name));

  const lowStock = items.filter((i) => i.active && i.quantity <= i.reorderLevel);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Inventory</h1>
          {lowStock.length > 0 && (
            <p className="mt-0.5 text-sm text-amber-600 dark:text-amber-400">
              {lowStock.length} item{lowStock.length > 1 ? 's' : ''} at or below reorder level
            </p>
          )}
        </div>
        <Link
          href="/admin/inventory/new"
          className="rounded-md bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          + New item
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Name</th>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Price</th>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Qty</th>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Reorder at</th>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-400">
                  No items yet.{' '}
                  <Link href="/admin/inventory/new" className="underline">
                    Add one
                  </Link>
                  .
                </td>
              </tr>
            )}
            {items.map((item) => {
              const isLow = item.active && item.quantity <= item.reorderLevel;
              return (
                <tr key={item.id} className={isLow ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''}>
                  <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                    {item.name}
                    {item.description && (
                      <p className="mt-0.5 text-xs font-normal text-zinc-400 line-clamp-1">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    ₱{Number(item.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        isLow
                          ? 'font-semibold text-amber-600 dark:text-amber-400'
                          : 'text-zinc-700 dark:text-zinc-300'
                      }
                    >
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{item.reorderLevel}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {item.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/inventory/${item.id}`}
                      className="text-xs text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
