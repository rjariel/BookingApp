import { asc } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/db';
import { paymentModes } from '@/db/schema';
import { requireModule } from '@/lib/permissions';
import ToggleActiveButton from './_components/ToggleActiveButton';

export const metadata = { title: 'Payment Modes' };

export default async function PaymentModesPage() {
  await requireModule('payment_modes');
  const modes = await db.select().from(paymentModes).orderBy(asc(paymentModes.createdAt));

  return (
    <div className="px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Payment Modes</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage accepted payment methods.</p>
        </div>
        <Link
          href="/admin/settings/payment-modes/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:opacity-80 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add mode
        </Link>
      </div>

      {modes.length === 0 ? (
        <p className="text-sm text-zinc-400">No payment modes yet.</p>
      ) : (
        <div className="divide-y divide-zinc-100 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-700">
          {modes.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium ${
                    m.active ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'
                  }`}
                >
                  {m.name}
                </span>
                {!m.active && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-400 dark:bg-zinc-800">
                    disabled
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/settings/payment-modes/${m.id}`}
                  className="rounded-md px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Edit
                </Link>
                <ToggleActiveButton id={m.id} active={m.active} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
