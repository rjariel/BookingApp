import Link from 'next/link';
import { redirect } from 'next/navigation';
import ItemForm from '../_components/ItemForm';
import { createItem } from '../actions';

export const metadata = { title: 'New Item — Inventory' };

async function createAndRedirect(formData: FormData) {
  'use server';
  const result = await createItem(formData);
  if (result.ok) redirect('/admin/inventory');
  return result;
}

export default function NewItemPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/admin/inventory"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Inventory
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">New item</h1>
      </div>

      <div className="max-w-lg">
        <ItemForm action={createAndRedirect} submitLabel="Create item" />
      </div>
    </div>
  );
}
