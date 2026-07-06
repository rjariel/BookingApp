/**
 * Shared booking-status rules used by both the rebook server action and the
 * pages that decide whether to show rebooking UI. Single source of truth so
 * the eligible-statuses list can't drift between the action and the UI.
 */

/**
 * Statuses a booking can be rebooked from. Excludes 'completed' (job already
 * done) and 'rebooked' (already superseded — rebook the newer booking instead
 * of chaining off an old one).
 */
export const REBOOKABLE_STATUSES = ['pending', 'confirmed', 'no_show', 'cancelled'] as const;

export type RebookableStatus = (typeof REBOOKABLE_STATUSES)[number];

export function isRebookable(status: string): status is RebookableStatus {
  return (REBOOKABLE_STATUSES as readonly string[]).includes(status);
}
