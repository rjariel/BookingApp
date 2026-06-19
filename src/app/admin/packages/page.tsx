import { asc } from 'drizzle-orm';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { packages } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-utils';
import { requireModule } from '@/lib/permissions';

export const metadata = { title: 'Packages — BookingApp' };

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default async function PackagesPage() {
  await requireModule('packages');
  try {
    await requireAdmin();
  } catch (err) {
    console.error('Package page auth error:', err);
    redirect('/admin');
  }

  const items = await db.select().from(packages).orderBy(asc(packages.name));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Packages</h1>
        <Link
          href="/admin/packages/new"
          className="rounded-md bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          + New package
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Name</th>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Price</th>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Duration</th>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">
                  No packages yet.{' '}
                  <Link href="/admin/packages/new" className="underline">
                    Add one
                  </Link>
                  .
                </td>
              </tr>
            )}
            {items.map((pkg) => (
              <tr key={pkg.id}>
                <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                  {pkg.name}
                  {pkg.details && (
                    <p className="mt-0.5 text-xs font-normal text-zinc-400 line-clamp-1">
                      {pkg.details}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  ₱{Number(pkg.price).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-zinc-500">{formatDuration(pkg.durationMin)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      pkg.active
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {pkg.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/packages/${pkg.id}`}
                    className="text-xs text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
