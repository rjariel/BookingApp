import { sql } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-utils';
import { deleteRole } from './actions';

// useActionState-compatible wrapper — pages can call server actions directly
// only if the action signature is (formData: FormData).
// deleteRole uses the useActionState signature (_prev, formData), so we wrap it.
async function deleteRoleAction(formData: FormData) {
  'use server';
  await deleteRole(undefined, formData);
}

export const metadata = { title: 'Roles' };

export default async function RolesPage() {
  await requireAdmin();

  const allRoles = await db.query.roles.findMany({
    orderBy: (r, { asc }) => [asc(r.isSystem), asc(r.name)],
    with: { permissions: true },
  });

  // Count users per role
  const userCounts = await db
    .select({ roleId: users.roleId, count: sql<number>`count(*)::int` })
    .from(users)
    .groupBy(users.roleId);
  const countMap = new Map(userCounts.map((r) => [r.roleId, r.count]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Roles</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Create roles with specific permissions, then assign them to users.
          </p>
        </div>
        <Link
          href="/admin/settings/roles/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          + New Role
        </Link>
      </div>

      <div className="space-y-3">
        {allRoles.map((role) => {
          const userCount = countMap.get(role.id) ?? 0;
          return (
            <div
              key={role.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-700"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 flex-none rounded-full"
                  style={{ backgroundColor: role.color }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {role.name}
                    </span>
                    {role.isSystem && (
                      <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        system
                      </span>
                    )}
                    <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {role.baseRole}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {role.permissions.length} module{role.permissions.length !== 1 ? 's' : ''} ·{' '}
                    {userCount} user{userCount !== 1 ? 's' : ''}
                    {role.description ? ` · ${role.description}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/settings/roles/${role.id}`}
                  className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Edit
                </Link>
                {!role.isSystem && (
                  <DeleteRoleButton roleId={role.id} roleName={role.name} userCount={userCount} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeleteRoleButton({
  roleId,
  roleName,
  userCount,
}: {
  roleId: string;
  roleName: string;
  userCount: number;
}) {
  return (
    <form
      action={deleteRoleAction}
      onSubmit={(e) => {
        const msg =
          userCount > 0
            ? `Delete "${roleName}"? ${userCount} user(s) will be moved to the Staff role.`
            : `Delete "${roleName}"?`;
        if (!confirm(msg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="roleId" value={roleId} />
      <button
        type="submit"
        className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        Delete
      </button>
    </form>
  );
}
