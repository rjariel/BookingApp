import { asc } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/db';
import { addons } from '@/db/schema';
import { requireModule } from '@/lib/permissions';

export const metadata = { title: 'Add-ons — BookingApp' };

export default async function AddonsPage() {
  await requireModule('addons');
  const items = await db.select().from(addons).orderBy(asc(addons.name));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Add-ons</h1>
        <Link
          href="/admin/addons/new"
          className="rounded-md bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          + New add-on
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Name</th>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Price</th>
              <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-400">
                  No add-ons yet.{' '}
                  <Link href="/admin/addons/new" className="underline">
                    Add one
                  </Link>
                  .
                </td>
              </tr>
            )}
            {items.map((addon) => (
              <tr key={addon.id}>
                <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                  {addon.name}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  ₱{Number(addon.price).toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      addon.active
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {addon.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/addons/${addon.id}`}
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
