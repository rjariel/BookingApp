'use client';

import { useActionState, useState } from 'react';
import { addDutyEntries } from '../actions';

type StaffUser = { id: string; name: string | null; email: string };

type Props = {
  today: string;
  remainingStaff: StaffUser[]; // staff NOT yet on today's roster
};

export default function AdminAddForm({ today, remainingStaff }: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addDutyEntries, null);

  if (remainingStaff.length === 0) return null;

  return (
    <div className="mt-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
        >
          + Add more staff
        </button>
      ) : (
        <form
          action={async (fd) => {
            await action(fd);
            setOpen(false);
          }}
          className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
        >
          <input type="hidden" name="date" value={today} />
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Add to roster
          </p>
          <div className="mb-4 space-y-2">
            {remainingStaff.map((u) => (
              <label key={u.id} className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  name="userIds"
                  value={u.id}
                  className="h-4 w-4 rounded border-zinc-300 accent-zinc-900 dark:accent-zinc-100"
                />
                <span className="text-sm text-zinc-800 dark:text-zinc-200">
                  {u.name ?? u.email}
                </span>
              </label>
            ))}
          </div>
          {state?.error && <p className="mb-2 text-xs text-red-500">{state.error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {pending ? 'Adding…' : 'Add selected'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-zinc-400 hover:underline"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
