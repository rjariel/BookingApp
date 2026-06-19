import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { expenseTypes } from '@/db/schema';
import { requireModule } from '@/lib/permissions';
import ExpenseTypeForm from '../_components/ExpenseTypeForm';
import { updateExpenseType } from '../actions';

export const metadata = { title: 'Edit Expense Type' };

export default async function EditExpenseTypePage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule('expense_types');
  const session = await auth();
  if (session?.user?.role !== 'admin') redirect('/admin');

  const { id } = await params;

  const [type] = await db.select().from(expenseTypes).where(eq(expenseTypes.id, id)).limit(1);

  if (!type) notFound();

  async function action(formData: FormData) {
    'use server';
    const result = await updateExpenseType(id, formData);
    if (result.ok) redirect('/admin/settings/expense-types');
    return result;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
        <Link
          href="/admin/settings/expense-types"
          className="hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Expense Types
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100">{type.name}</span>
      </div>
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Edit expense type
      </h1>
      <ExpenseTypeForm
        action={action}
        defaultName={type.name}
        defaultIsInventoryPurchase={type.isInventoryPurchase}
        submitLabel="Save changes"
      />
    </div>
  );
}
