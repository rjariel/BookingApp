'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { replaceDutyRoster } from '../duty/actions';

type StaffUser = { id: string; name: string | null; email: string };
type DutyEntry = { userId: string; name: string };

type Props = {
  today: string;
  allStaff: StaffUser[];
  currentDuty: DutyEntry[];
  canEdit: boolean;
};

export default function OnDutyToday({ today, allStaff, currentDuty, canEdit }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [state, action, pending] = useActionState(replaceDutyRoster, null);

  // Close modal after successful submission
  if (state?.success && showModal) {
    setShowModal(false);
  }

  const currentUserIds = new Set(currentDuty.map((d) => d.userId));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">On Duty</h3>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/duty/history"
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            History
          </Link>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowModal(!showModal)}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {showModal ? 'Done' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      {currentDuty.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-100/50 py-3 px-3 text-center dark:border-zinc-700 dark:bg-zinc-800/30">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">No one assigned yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {currentDuty.map((entry) => (
            <div
              key={entry.userId}
              className="inline-flex items-center rounded-lg border border-green-200 bg-green-50/50 px-3 py-1.5 text-sm font-medium text-green-700 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-300"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-2" />
              {entry.name}
            </div>
          ))}
        </div>
      )}

      {/* Quick edit modal */}
      {showModal && canEdit && (
        <form
          action={action}
          className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/30"
        >
          <input type="hidden" name="date" value={today} />

          <p className="mb-3 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Select staff on duty:
          </p>

          <div className="mb-4 space-y-2">
            {allStaff.map((u) => (
              <label
                key={u.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <input
                  type="checkbox"
                  name="userIds"
                  value={u.id}
                  defaultChecked={currentUserIds.has(u.id)}
                  className="h-4 w-4 rounded border-zinc-300 accent-blue-600 dark:accent-blue-400"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {u.name ?? u.email}
                </span>
              </label>
            ))}
          </div>

          {state?.error && <p className="mb-3 text-xs text-red-500">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-blue-600 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            {pending ? 'Saving…' : 'Update duty roster'}
          </button>
        </form>
      )}
    </div>
  );
}
