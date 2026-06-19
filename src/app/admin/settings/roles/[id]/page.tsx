import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { roles } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-utils';
import type { ModuleSlug } from '@/lib/permissions';
import { RoleForm } from '../_components/RoleForm';
import { updateRole } from '../actions';

export const metadata = { title: 'Edit Role' };

type Props = { params: Promise<{ id: string }> };

export default async function EditRolePage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const role = await db.query.roles.findFirst({
    where: eq(roles.id, id),
    with: { permissions: true },
  });

  if (!role) notFound();

  const grantedModules = role.permissions.map((p) => p.module as ModuleSlug);

  // Bind roleId into the action
  const boundUpdate = updateRole.bind(null, role.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Edit Role — {role.name}
        </h1>
        {role.isSystem && (
          <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
            This is a system role. Slug and base type are immutable, but you can rename it and
            adjust permissions.
          </p>
        )}
      </div>
      <RoleForm
        action={boundUpdate}
        role={role}
        grantedModules={grantedModules}
        isSystem={role.isSystem}
      />
    </div>
  );
}
