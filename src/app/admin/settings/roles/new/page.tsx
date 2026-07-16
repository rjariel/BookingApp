import { requireAdmin } from '@/lib/auth-utils';
import { RoleForm } from '../_components/RoleForm';
import { createRole } from '../actions';

export const metadata = { title: 'New Role' };

export default async function NewRolePage() {
  await requireAdmin();

  return (
    <div className="px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">New Role</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Define a role with a name, base type, and module permissions.
        </p>
      </div>
      <RoleForm action={createRole} />
    </div>
  );
}
