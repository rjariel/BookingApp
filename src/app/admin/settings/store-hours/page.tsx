import { requireModule } from '@/lib/permissions';
import { getStoreHours } from '@/lib/store-settings';
import { StoreHoursForm } from './_components/StoreHoursForm';

export const metadata = { title: 'Store Hours' };

export default async function StoreHoursPage() {
  await requireModule('settings');
  const hours = await getStoreHours();

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Store Hours</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          The open and close times used to compute available booking slots on the dashboard.
        </p>
      </div>

      <StoreHoursForm openTime={hours.openTime} closeTime={hours.closeTime} />
    </div>
  );
}
