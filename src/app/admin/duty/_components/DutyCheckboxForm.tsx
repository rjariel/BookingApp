'use client';

import { useActionState } from 'react';
import { submitDutyRoster } from '../actions';

type StaffUser = { id: string; name: string | null; email: string };

type Props = {
  today: string;
  staff: StaffUser[];
};

export default function DutyCheckboxForm({ today, staff }: Props) {
  const [state, action, pending] = useActionState(submitDutyRoster, null);

  return (
    <form action={action} className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-700">
      <input type="hidden" name="date" value={today} />

      <p className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Select who is on duty today:
      </p>

      <div className="mb-5 space-y-2.5">
        {staff.map((u) => (
          <label
            key={u.id}
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          >
            <input
              type="checkbox"
              name="userIds"
              value={u.id}
              className="h-4 w-4 rounded border-zinc-300 accent-zinc-900 dark:accent-zinc-100"
            />
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {(u.name ?? u.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {u.name ?? u.email}
                </p>
                {u.name && <p className="text-xs text-zinc-400">{u.email}</p>}
              </div>
            </div>
          </label>
        ))}
      </div>

      {state?.error && <p className="mb-3 text-sm text-red-500">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 py-2.5 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? 'Saving…' : 'Save duty roster'}
      </button>
    </form>
  );
}
