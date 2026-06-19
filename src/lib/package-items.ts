import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { inventoryItems, packageItems } from '@/db/schema';

/**
 * Fetch all included items for a package.
 * Returns array of { itemId, qty, name, price }
 */
export async function getPackageItems(packageId: string) {
  const rows = await db
    .select({
      itemId: packageItems.itemId,
      qty: packageItems.qty,
      name: inventoryItems.name,
      price: inventoryItems.price,
    })
    .from(packageItems)
    .innerJoin(inventoryItems, eq(packageItems.itemId, inventoryItems.id))
    .where(eq(packageItems.packageId, packageId));

  return rows;
}
