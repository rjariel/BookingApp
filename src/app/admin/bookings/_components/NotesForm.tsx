'use client';

import { useActionState } from 'react';
import type { ActionResult } from '../actions';
import { updateBookingNotes } from '../actions';

type Props = { bookingId: string; currentNotes: string };

const initialState: ActionResult | null = null;

export default function NotesForm({ bookingId, currentNotes }: Props) {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) =>
      updateBookingNotes(bookingId, formData),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      {state && !state.ok && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {state?.ok && <p className="text-sm text-emerald-600 dark:text-emerald-400">Notes saved.</p>}
      <textarea
        name="notes"
        rows={4}
        defaultValue={currentNotes}
        placeholder="No notes yet…"
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {pending ? 'Saving…' : 'Save notes'}
      </button>
    </form>
  );
}
