'use client';

import { useActionState, useState } from 'react';
import { updateBookingPackage } from '../actions';

type Package = { id: string; name: string; price: string };

type Props = {
  bookingId: string;
  currentPackageId: string;
  packages: Package[];
};

export default function PackageEditor({ bookingId, currentPackageId, packages }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState(currentPackageId);

  type State = { ok: boolean; error?: string } | null;
  const [state, formAction, pending] = useActionState(
    async (_prev: State, _formData: FormData): Promise<State> => {
      if (selectedPackageId === currentPackageId) {
        setIsEditing(false);
        return { ok: true };
      }
      const result = await updateBookingPackage(bookingId, selectedPackageId);
      if (result.ok) {
        setIsEditing(false);
        return { ok: true };
      }
      return { ok: false, error: result.error };
    },
    null as State,
  );

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Edit
      </button>
    );
  }

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      {state && !state.ok && (
        <span className="text-xs text-red-600 dark:text-red-400">
          {state.error ?? 'Something went wrong.'}
        </span>
      )}

      <select
        value={selectedPackageId}
        onChange={(e) => setSelectedPackageId(e.target.value)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        disabled={pending}
      >
        {packages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} (₱{parseFloat(p.price).toFixed(2)})
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={pending || selectedPackageId === currentPackageId}
        className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 dark:bg-blue-600"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>

      <button
        type="button"
        onClick={() => {
          setIsEditing(false);
          setSelectedPackageId(currentPackageId);
        }}
        disabled={pending}
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-900"
      >
        Cancel
      </button>
    </form>
  );
}
