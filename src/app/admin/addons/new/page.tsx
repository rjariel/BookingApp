import Link from 'next/link';
import { redirect } from 'next/navigation';
import AddonForm from '../_components/AddonForm';
import { createAddon } from '../actions';

export const metadata = { title: 'New Add-on — BookingApp' };

export default function NewAddonPage() {
  async function action(formData: FormData) {
    'use server';
    const result = await createAddon(formData);
    if (result.ok) redirect('/admin/addons');
    return result;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/admin/addons"
          className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Add-ons
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">New add-on</h1>
      </div>

      <div className="max-w-sm">
        <AddonForm action={action} submitLabel="Create add-on" />
      </div>
    </div>
  );
}
