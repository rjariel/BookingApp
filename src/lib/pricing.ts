/**
 * Booking pricing — pure functions, no I/O, fully unit-tested.
 * A booking total is the required package price plus every priced add-on line.
 */

export type AddonLine = {
  unitPrice: number;
  qty: number;
};

/** Round to 2 decimal places (currency-safe for numeric(10,2) amounts). */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** amount_total = package price + Σ(addon.unitPrice × addon.qty). */
export function calcBookingTotal(packagePrice: number, addons: AddonLine[] = []): number {
  const addonsTotal = addons.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
  return round2(packagePrice + addonsTotal);
}

/** Derive payment status from the total owed and the amount paid so far. */
export function paymentStatusFor(total: number, paid: number): 'unpaid' | 'partial' | 'paid' {
  if (paid <= 0) return 'unpaid';
  if (paid >= total) return 'paid';
  return 'partial';
}

/**
 * Rebooking deposit — 50% of the *original* booking's package price, due
 * up front to hold the new date. Applies regardless of what the new
 * booking's package/add-ons end up costing.
 */
export function rebookingDeposit(originalPackagePrice: number): number {
  return round2(originalPackagePrice * 0.5);
}
