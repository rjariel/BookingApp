import { requireModule } from '@/lib/permissions';
import { getStudioProfile } from '@/lib/store-settings';
import { StudioForm } from './_components/StudioForm';

export const metadata = { title: 'Studio Profile' };

export default async function StudioProfilePage() {
  await requireModule('settings');
  const profile = await getStudioProfile();

  return (
    <div className="px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Studio Profile</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Your studio name and logo shown across the app.
        </p>
      </div>

      <StudioForm studioName={profile.studioName} logoUrl={profile.logoUrl} />
    </div>
  );
}
