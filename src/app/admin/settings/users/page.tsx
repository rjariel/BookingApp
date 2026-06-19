import { asc } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/db';
import { requireAdmin } from '@/lib/auth-utils';
import { RoleSelector } from './_components/RoleSelector';
import { ToggleActiveButton } from './_components/ToggleActiveButton';

export const metadata = { title: 'Users & Roles' };

export default async function UsersSettingsPage() {
  await requireAdmin();

  const [allUsers, allRoles] = await Promise.all([
    db.query.users.findMany({
      orderBy: (u) => [asc(u.role), asc(u.name)],
      with: { assignedRole: true },
    }),
    db.query.roles.findMany({ orderBy: (r) => [asc(r.name)] }),
  ]);

  const adminUsers = allUsers.filter((u) => u.role === 'admin');
  const otherUsers = allUsers.filter((u) => u.role !== 'admin');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Users & Roles</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Assign roles to users. Module permissions are managed per role in{' '}
            <Link
              href="/admin/settings/roles"
              className="underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              Settings → Roles
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Admin users */}
      {adminUsers.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Admins — Full Access
          </h2>
          <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-700">
            {adminUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {u.name ?? '—'}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{u.email}</p>
                </div>
                <RoleBadge
                  name={u.assignedRole?.name ?? 'Administrator'}
                  color={u.assignedRole?.color ?? '#dc2626'}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Staff / Client users */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Staff & Clients
        </h2>

        {otherUsers.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No users yet.</p>
        ) : (
          <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-700">
            {otherUsers.map((u) => (
              <div
                key={u.id}
                className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                  !u.active ? 'opacity-50' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {u.name ?? '—'}
                    </p>
                    {u.assignedRole && (
                      <RoleBadge name={u.assignedRole.name} color={u.assignedRole.color} />
                    )}
                    {!u.active && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{u.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  {u.active && (
                    <RoleSelector userId={u.id} currentRoleId={u.roleId} roles={allRoles} />
                  )}
                  <ToggleActiveButton userId={u.id} active={u.active} name={u.name ?? u.email} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RoleBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  );
}
