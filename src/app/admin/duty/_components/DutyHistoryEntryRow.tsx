'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { removeDutyEntries, upsertDutyEntry } from '../actions';

type StaffUser = { id: string; name: string | null; email: string };

type Entry = {
  id: string;
  userId: string;
  date: string;
  name: string;
  email: string;
  notes: string | null;
};

type Props = {
  entry: Entry;
  staff: StaffUser[];
  isAdmin: boolean;
};

export default function DutyHistoryEntryRow({ entry, staff, isAdmin }: Props) {
  const [editing, setEditing] = useState(false);
  const [removePending, startRemove] = useTransition();
  const [state, action, savePending] = useActionState(upsertDutyEntry, null);

  // Close the edit form once the save succeeds. Effect-based (not derived
  // during render) so it fires once per actual submission, not every time
  // this row is re-entered into edit mode after a prior success.
  useEffect(() => {
    if (state?.success) setEditing(false);
  }, [state]);

  function remove() {
    if (!window.confirm(`Remove ${entry.name} from duty on ${entry.date}?`)) return;
    startRemove(async () => {
      await removeDutyEntries([entry.id]);
    });
  }

  if (isAdmin && editing) {
    return (
      <form
        action={action}
        className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50"
      >
        <input type="hidden" name="id" value={entry.id} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            name="date"
            type="date"
            required
            defaultValue={entry.date}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <select
            name="userId"
            required
            defaultValue={entry.userId}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {staff.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? u.email}
              </option>
            ))}
          </select>
          <input
            name="notes"
            type="text"
            defaultValue={entry.notes ?? ''}
            placeholder="Notes"
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        {state?.error && <p className="mt-2 text-xs text-red-500">{state.error}</p>}

        <div className="mt-2 flex gap-2">
          <button
            type="submit"
            disabled={savePending}
            className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {savePending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-zinc-400 hover:underline"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-2.5 dark:border-zinc-700">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {entry.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{entry.name}</p>
          {entry.notes && (
            <p className="text-xs italic text-zinc-500 dark:text-zinc-400">{entry.notes}</p>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={removePending}
            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-300"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
