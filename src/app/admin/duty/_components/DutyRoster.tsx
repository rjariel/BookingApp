'use client';

import { useState, useTransition } from 'react';
import { removeDutyEntries, updateDutyNote } from '../actions';

type Entry = {
  id: string;
  userId: string;
  name: string;
  email: string;
  notes: string | null;
};

type Props = {
  entries: Entry[];
  isAdmin: boolean;
};

function DutyEntry({ entry, isAdmin }: { entry: Entry; isAdmin: boolean }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(entry.notes ?? '');
  const [pending, start] = useTransition();

  function saveNote() {
    start(async () => {
      await updateDutyNote(entry.id, note);
      setEditing(false);
    });
  }

  function remove() {
    start(async () => {
      await removeDutyEntries([entry.id]);
    });
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-700">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {entry.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{entry.name}</p>
          <p className="text-xs text-zinc-400">{entry.email}</p>

          {isAdmin && editing ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note…"
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <button
                onClick={saveNote}
                disabled={pending}
                className="text-xs font-medium text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-400"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setNote(entry.notes ?? '');
                }}
                className="text-xs text-zinc-400 hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            entry.notes && (
              <p className="mt-0.5 text-xs italic text-zinc-500 dark:text-zinc-400">
                {entry.notes}
              </p>
            )
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="flex shrink-0 items-center gap-3">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              Edit note
            </button>
          )}
          <button
            onClick={remove}
            disabled={pending}
            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-300"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

export default function DutyRoster({ entries, isAdmin }: Props) {
  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <DutyEntry key={e.id} entry={e} isAdmin={isAdmin} />
      ))}
    </div>
  );
}
