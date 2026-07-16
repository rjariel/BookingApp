import { asc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { expenseTypes, inventoryItems, paymentModes } from '@/db/schema';
import { requireModule } from '@/lib/permissions';
import ExpenseForm from '../_components/ExpenseForm';
import { createExpense } from '../actions';

export const metadata = { title: 'Log Expense' };

export default async function NewExpensePage() {
  await requireModule('expenses');

  const [types, modes, items] = await Promise.all([
    db
      .select({
        id: expenseTypes.id,
        name: expenseTypes.name,
        isInventoryPurchase: expenseTypes.isInventoryPurchase,
      })
      .from(expenseTypes)
      .where(eq(expenseTypes.active, true))
      .orderBy(asc(expenseTypes.name)),
    db
      .select({ id: paymentModes.id, name: paymentModes.name })
      .from(paymentModes)
      .where(eq(paymentModes.active, true))
      .orderBy(asc(paymentModes.name)),
    db
      .select({ id: inventoryItems.id, name: inventoryItems.name })
      .from(inventoryItems)
      .where(eq(inventoryItems.active, true))
      .orderBy(asc(inventoryItems.name)),
  ]);

  async function action(formData: FormData) {
    'use server';
    const result = await createExpense(formData);
    if (result.ok) redirect('/admin/expenses');
    return result;
  }

  return (
    <div className="px-4 py-8">
      <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/admin/expenses" className="hover:text-zinc-700 dark:hover:text-zinc-300">
          Expenses
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100">New</span>
      </div>
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Log expense</h1>
      <ExpenseForm
        action={action}
        expenseTypes={types}
        paymentModes={modes}
        inventoryItems={items}
        submitLabel="Save expense"
      />
    </div>
  );
}
