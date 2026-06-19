import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth-utils';
import { requireModule } from '@/lib/permissions';
import PackageForm from '../_components/PackageForm';
import { createPackage } from '../actions';

export const metadata = { title: 'New Package — BookingApp' };

export default async function NewPackagePage() {
  await requireModule('packages');
  try {
    await requireAdmin();
  } catch (err) {
    console.error('New package page auth error:', err);
    redirect('/admin');
  }
  async function action(formData: FormData) {
    'use server';
    const result = await createPackage(formData);
    if (result.ok) redirect('/admin/packages');
    return result;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/admin/packages"
          className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Packages
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">New package</h1>
      </div>

      <div className="max-w-lg">
        <PackageForm action={action} submitLabel="Create package" />
      </div>
    </div>
  );
}
