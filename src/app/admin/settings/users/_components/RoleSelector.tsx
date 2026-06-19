'use client';

import { useActionState } from 'react';
import type { Role } from '@/db/schema';
import { assignUserRole } from '@/app/admin/settings/roles/actions';

type Props = {
  userId: string;
  currentRoleId: string | null;
  roles: Role[];
};

export function RoleSelector({ userId, currentRoleId, roles }: Props) {
  const [state, action, pending] = useActionState(assignUserRole, undefined);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="roleId"
        defaultValue={currentRoleId ?? ''}
        className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
      >
        <option value="" disabled>
          — Select role —
        </option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? '…' : 'Assign'}
      </button>
      {state?.error && (
        <span className="text-xs text-red-600 dark:text-red-400">{state.error}</span>
      )}
      {!state?.error && state !== undefined && (
        <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved ✓</span>
      )}
    </form>
  );
}
