import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/db';
import { expenses, expenseTypes, paymentModes } from '@/db/schema';
import { requireModule } from '@/lib/permissions';

export const metadata = { title: 'Expenses' };

const fmtMoney = (v: string) =>
  `₱${parseFloat(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export default async function ExpensesPage() {
  await requireModule('expenses');

  const rows = await db
    .select({
      id: expenses.id,
      amount: expenses.amount,
      spentOn: expenses.spentOn,
      description: expenses.description,
      typeName: expenseTypes.name,
      isInventoryPurchase: expenseTypes.isInventoryPurchase,
      modeName: paymentModes.name,
    })
    .from(expenses)
    .leftJoin(expenseTypes, eq(expenses.expenseTypeId, expenseTypes.id))
    .leftJoin(paymentModes, eq(expenses.paymentModeId, paymentModes.id))
    .orderBy(desc(expenses.spentOn), desc(expenses.createdAt))
    .limit(200);

  return (
    <div className="px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Expenses</h1>
          <p className="mt-1 text-sm text-zinc-500">Track money out. Showing last 200 records.</p>
        </div>
        <Link
          href="/admin/expenses/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:opacity-80 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Log expense
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">No expenses logged yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium">Method</th>
                <th className="pb-2 text-right font-medium">Amount</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-3 pr-4 text-zinc-500 whitespace-nowrap">{r.spentOn}</td>
                  <td className="py-3 pr-4">
                    <span className="text-zinc-800 dark:text-zinc-200">{r.typeName ?? '—'}</span>
                    {r.isInventoryPurchase && (
                      <span className="ml-1.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-xs text-violet-600 dark:bg-violet-950/30 dark:text-violet-400">
                        inv
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-zinc-500 max-w-[200px] truncate">
                    {r.description ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-zinc-500">{r.modeName ?? '—'}</td>
                  <td className="py-3 text-right font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                    {fmtMoney(r.amount)}
                  </td>
                  <td className="py-3 pl-3">
                    <Link
                      href={`/admin/expenses/${r.id}`}
                      className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
