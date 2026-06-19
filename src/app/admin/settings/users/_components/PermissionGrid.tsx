'use client';

import { useActionState } from 'react';
import { ALL_MODULES, MODULE_LABELS } from '@/db/schema';
import type { ModuleSlug } from '@/lib/permissions';
import { setUserPermissions } from '../actions';

type Props = {
  userId: string;
  userName: string;
  grantedModules: ModuleSlug[];
};

export function PermissionGrid({ userId, userName, grantedModules }: Props) {
  const [state, action, pending] = useActionState(setUserPermissions, undefined);
  const granted = new Set(grantedModules);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Permissions for{' '}
        <span className="font-medium text-zinc-700 dark:text-zinc-200">{userName}</span>
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ALL_MODULES.map((mod) => (
          <label
            key={mod}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <input
              type="checkbox"
              name="modules"
              value={mod}
              defaultChecked={granted.has(mod as ModuleSlug)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-600"
            />
            <span className="text-zinc-700 dark:text-zinc-300">
              {MODULE_LABELS[mod as ModuleSlug]}
            </span>
          </label>
        ))}
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? 'Saving…' : 'Save permissions'}
        </button>
        {!state?.error && state !== undefined && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved ✓</span>
        )}
      </div>
    </form>
  );
}
