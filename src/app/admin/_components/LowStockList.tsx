import { asc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { inventoryItems } from '@/db/schema';

async function getLowStockItems() {
  // Items where quantity <= reorder_level (and reorder_level > 0 to skip "not tracked")
  return db
    .select({
      id: inventoryItems.id,
      name: inventoryItems.name,
      quantity: inventoryItems.quantity,
      reorderLevel: inventoryItems.reorderLevel,
    })
    .from(inventoryItems)
    .where(
      sql`${inventoryItems.quantity} <= ${inventoryItems.reorderLevel} AND ${inventoryItems.reorderLevel} > 0 AND ${inventoryItems.active} = true`,
    )
    .orderBy(
      // Most critical first: furthest below reorder level
      asc(sql`${inventoryItems.quantity} - ${inventoryItems.reorderLevel}`),
    );
}

export default async function LowStockList() {
  const items = await getLowStockItems();

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Low stock
        {items.length > 0 && (
          <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {items.length}
          </span>
        )}
      </h2>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 py-8 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-400">All items are sufficiently stocked.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-700">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.name}</p>
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span>
                  reorder at{' '}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {item.reorderLevel}
                  </span>
                </span>
                <span
                  className={`font-semibold tabular-nums ${
                    item.quantity === 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-orange-600 dark:text-orange-400'
                  }`}
                >
                  {item.quantity} left
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
