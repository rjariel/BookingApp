import Link from 'next/link';
import { redirect } from 'next/navigation';
import ExpenseTypeForm from '../_components/ExpenseTypeForm';
import { createExpenseType } from '../actions';

export const metadata = { title: 'New Expense Type' };

export default async function NewExpenseTypePage() {

  async function action(formData: FormData) {
    'use server';
    const result = await createExpenseType(formData);
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
        <span className="text-zinc-900 dark:text-zinc-100">New</span>
      </div>
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Add expense type
      </h1>
      <ExpenseTypeForm action={action} submitLabel="Create" />
    </div>
  );
}
