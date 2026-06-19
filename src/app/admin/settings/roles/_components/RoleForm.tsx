'use client';

import { useActionState } from 'react';
import type { Role } from '@/db/schema';
import { ALL_MODULES, MODULE_LABELS } from '@/db/schema';
import type { ModuleSlug } from '@/lib/permissions';

const BASE_ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator', hint: 'Full unrestricted access' },
  { value: 'staff', label: 'Staff', hint: 'Internal team member' },
  { value: 'client', label: 'Client', hint: 'External client / customer' },
] as const;

const PRESET_COLORS = [
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0891b2',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#6b7280',
  '#374151',
];

type Props = {
  action: (prev: unknown, fd: FormData) => Promise<{ error?: string }>;
  role?: Role;
  grantedModules?: ModuleSlug[];
  isSystem?: boolean;
};

export function RoleForm({ action, role, grantedModules = [], isSystem = false }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const granted = new Set(grantedModules);

  function slugify(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Name + Slug */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Role Name
          </label>
          <input
            name="name"
            defaultValue={role?.name ?? ''}
            required
            maxLength={80}
            onChange={(e) => {
              if (!role) {
                const slugEl = document.querySelector<HTMLInputElement>('[name="slug"]');
                if (slugEl) slugEl.value = slugify(e.target.value);
              }
            }}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            placeholder="e.g. Photographer"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Slug
          </label>
          <input
            name="slug"
            defaultValue={role?.slug ?? ''}
            required
            maxLength={80}
            readOnly={isSystem}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:bg-zinc-800 dark:text-zinc-100 ${
              isSystem
                ? 'border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900'
                : 'border-zinc-300 dark:border-zinc-600'
            }`}
            placeholder="photographer"
          />
          {isSystem && (
            <p className="mt-1 text-xs text-zinc-400">System role — slug cannot be changed.</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Description <span className="text-zinc-400">(optional)</span>
        </label>
        <input
          name="description"
          defaultValue={role?.description ?? ''}
          maxLength={200}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          placeholder="Short description of this role's purpose"
        />
      </div>

      {/* Base Role + Color */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Base Role
          </label>
          <select
            name="baseRole"
            defaultValue={role?.baseRole ?? 'staff'}
            disabled={isSystem}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:bg-zinc-800 dark:text-zinc-100 ${
              isSystem
                ? 'border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900'
                : 'border-zinc-300 dark:border-zinc-600'
            }`}
          >
            {BASE_ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.hint}
              </option>
            ))}
          </select>
          {isSystem && (
            <p className="mt-1 text-xs text-zinc-400">System role — base type cannot be changed.</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Badge Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              name="color"
              id="color-picker"
              defaultValue={role?.color ?? '#6b7280'}
              className="h-9 w-12 cursor-pointer rounded border border-zinc-300 p-0.5 dark:border-zinc-600"
            />
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    const el = document.getElementById('color-picker') as HTMLInputElement | null;
                    if (el) el.value = c;
                  }}
                  className="h-6 w-6 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110 dark:border-zinc-700"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Module Permissions */}
      <div>
        <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Module Permissions
        </p>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Administrator base-role always has full access regardless of these selections.
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
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? 'Saving…' : role ? 'Save Changes' : 'Create Role'}
        </button>
        <a
          href="/admin/settings/roles"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
