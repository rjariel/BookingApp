import { asc } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/db';
import { expenseTypes } from '@/db/schema';
import { requireModule } from '@/lib/permissions';
import ToggleActiveButton from './_components/ToggleActiveButton';
import ToggleInventoryButton from './_components/ToggleInventoryButton';

export const metadata = { title: 'Expense Types' };

export default async function ExpenseTypesPage() {
  await requireModule('expense_types');

  const types = await db.select().from(expenseTypes).orderBy(asc(expenseTypes.createdAt));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
        <Link
          href="/admin/settings/payment-modes"
          className="hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Settings
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100">Expense Types</span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Expense Types</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Categorise outgoing expenses. Mark inventory-purchase types to auto-restock on save.
          </p>
        </div>
        <Link
          href="/admin/settings/expense-types/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:opacity-80 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add type
        </Link>
      </div>

      {types.length === 0 ? (
        <p className="text-sm text-zinc-400">No expense types yet.</p>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-700">
          {types.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium ${
                    t.active ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'
                  }`}
                >
                  {t.name}
                </span>
                {!t.active && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-400 dark:bg-zinc-800">
                    disabled
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <ToggleInventoryButton id={t.id} isInventoryPurchase={t.isInventoryPurchase} />
                <Link
                  href={`/admin/settings/expense-types/${t.id}`}
                  className="rounded-md px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Edit
                </Link>
                <ToggleActiveButton id={t.id} active={t.active} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
