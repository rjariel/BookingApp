'use client';

import { useActionState, useEffect, useState } from 'react';
import { upsertDutyEntry } from '../actions';

type StaffUser = { id: string; name: string | null; email: string };

type Props = {
  staff: StaffUser[];
  defaultDate: string;
};

export default function AddDutyEntryForm({ staff, defaultDate }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(upsertDutyEntry, null);

  // Close the form once the save succeeds. Effect (not derived-during-render
  // state) so this fires once per actual new submission, not every time the
  // form is reopened after a prior success is still sitting in state.
  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  if (staff.length === 0) return null;

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-80 dark:bg-zinc-100 dark:text-zinc-900"
        >
          + Add entry
        </button>
      ) : (
        <form
          action={action}
          className="w-full max-w-sm rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Add duty entry
          </p>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">Date</span>
              <input
                name="date"
                type="date"
                required
                defaultValue={defaultDate}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">Staff</span>
              <select
                name="userId"
                required
                defaultValue=""
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="" disabled>
                  Select staff…
                </option>
                {staff.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">Notes (optional)</span>
              <input
                name="notes"
                type="text"
                placeholder="e.g. covering morning shift"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>
          </div>

          {state?.error && <p className="mt-3 text-xs text-red-500">{state.error}</p>}

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
