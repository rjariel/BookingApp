import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { inventoryItems, stockLedger } from '@/db/schema';
import { requireModule } from '@/lib/permissions';
import AdjustStockForm from '../_components/AdjustStockForm';
import ItemForm from '../_components/ItemForm';
import ToggleActiveButton from '../_components/ToggleActiveButton';
import { adjustStock, toggleActive, updateItem } from '../actions';

export const metadata = { title: 'Edit Item — Inventory' };

type Props = { params: Promise<{ id: string }> };

export default async function EditItemPage({ params }: Props) {
  await requireModule('inventory');
  const { id } = await params;

  const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);

  if (!item) notFound();

  const ledger = await db
    .select()
    .from(stockLedger)
    .where(eq(stockLedger.itemId, id))
    .orderBy(desc(stockLedger.createdAt))
    .limit(50);

  async function handleUpdate(formData: FormData) {
    'use server';
    const result = await updateItem(id, formData);
    if (result.ok) redirect('/admin/inventory');
    return result;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/admin/inventory"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Inventory
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</h1>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              item.active
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
            }`}
          >
            {item.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Edit form */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Item details
          </h2>
          <ItemForm item={item} action={handleUpdate} submitLabel="Save changes" />

          <div className="mt-6 border-t border-zinc-100 pt-6 dark:border-zinc-800">
            <ToggleActiveButton id={item.id} active={item.active} toggleActive={toggleActive} />
          </div>
        </section>

        {/* Stock */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Stock — current: {item.quantity}
          </h2>

          <AdjustStockForm itemId={item.id} adjustStock={adjustStock} />

          {/* Ledger */}
          <div className="mt-6">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Ledger (last 50)
            </h3>
            <div className="space-y-1">
              {ledger.length === 0 && (
                <p className="text-sm text-zinc-400">No stock movements yet.</p>
              )}
              {ledger.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-md border border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-xs font-semibold ${
                        entry.delta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                      }`}
                    >
                      {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                    </span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {entry.type}
                    </span>
                  </div>
                  <time className="text-xs text-zinc-400">
                    {new Intl.DateTimeFormat('en-PH', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(entry.createdAt))}
                  </time>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
