import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { addons } from '@/db/schema';
import { requireModule } from '@/lib/permissions';
import AddonForm from '../_components/AddonForm';
import ToggleActiveButton from '../_components/ToggleActiveButton';
import { updateAddon } from '../actions';

export const metadata = { title: 'Edit Add-on — BookingApp' };

export default async function EditAddonPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule('addons');
  const { id } = await params;

  const [addon] = await db.select().from(addons).where(eq(addons.id, id)).limit(1);

  if (!addon) notFound();

  async function action(formData: FormData) {
    'use server';
    const result = await updateAddon(id, formData);
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
        <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {addon.name}
        </h1>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Edit form */}
        <div className="w-full max-w-sm">
          <AddonForm addon={addon} action={action} submitLabel="Save changes" />
        </div>

        {/* Status panel */}
        <div className="w-full max-w-xs rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</h2>
          <p className="mb-4 text-sm text-zinc-500">
            {addon.active
              ? 'This add-on is active and selectable in bookings.'
              : 'This add-on is inactive and hidden from booking forms.'}
          </p>
          <ToggleActiveButton id={addon.id} active={addon.active} />
        </div>
      </div>
    </div>
  );
}
