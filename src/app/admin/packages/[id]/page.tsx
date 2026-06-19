import { eq, isNull } from 'drizzle-orm';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { addons, inventoryItems, packageAddons, packageItems, packages } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-utils';
import { requireModule } from '@/lib/permissions';
import PackageAddonsManager from '../_components/PackageAddonsManager';
import PackageForm from '../_components/PackageForm';
import PackageItemsManager from '../_components/PackageItemsManager';
import ToggleActiveButton from '../_components/ToggleActiveButton';
import { updatePackage } from '../actions';

export const metadata = { title: 'Edit Package — BookingApp' };

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule('packages');
  try {
    await requireAdmin();
  } catch (err) {
    console.error('Edit package page auth error:', err);
    redirect('/admin');
  }

  const { id } = await params;

  const [pkg] = await db.select().from(packages).where(eq(packages.id, id)).limit(1);

  if (!pkg) notFound();

  // Fetch package items with inventory details
  const pkgItems = await db
    .select({
      itemId: packageItems.itemId,
      qty: packageItems.qty,
      name: inventoryItems.name,
      price: inventoryItems.price,
    })
    .from(packageItems)
    .innerJoin(inventoryItems, eq(packageItems.itemId, inventoryItems.id))
    .where(eq(packageItems.packageId, id));

  // Fetch all active inventory items
  const allItems = await db.select().from(inventoryItems).where(eq(inventoryItems.active, true));

  // Fetch global add-ons (packageId IS NULL)
  const globalAddons = await db.select().from(addons).where(isNull(addons.packageId));

  // Fetch linked global add-ons for this package
  const linkedGlobalAddonIds = await db
    .select({ addonId: packageAddons.addonId })
    .from(packageAddons)
    .where(eq(packageAddons.packageId, id));

  // Fetch custom add-ons for this package
  const customAddons = await db.select().from(addons).where(eq(addons.packageId, id));

  // Combine global add-ons with link status
  const globalAddonsWithStatus = globalAddons.map((addon) => ({
    ...addon,
    isLinked: linkedGlobalAddonIds.some((link) => link.addonId === addon.id),
  }));

  async function action(formData: FormData) {
    'use server';
    const result = await updatePackage(id, formData);
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
        <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{pkg.name}</h1>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Left column: Edit form + items manager + add-ons manager */}
        <div className="w-full max-w-lg space-y-6">
          <PackageForm pkg={pkg} action={action} submitLabel="Save changes" />
          <PackageItemsManager packageId={id} items={pkgItems} allInventoryItems={allItems} />
          <PackageAddonsManager
            packageId={id}
            globalAddons={globalAddonsWithStatus}
            customAddons={customAddons}
          />
        </div>

        {/* Status panel */}
        <div className="w-full max-w-xs rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</h2>
          <p className="mb-4 text-sm text-zinc-500">
            {pkg.active
              ? 'This package is active and selectable in bookings.'
              : 'This package is inactive and hidden from booking forms.'}
          </p>
          <ToggleActiveButton id={pkg.id} active={pkg.active} />
        </div>
      </div>
    </div>
  );
}
