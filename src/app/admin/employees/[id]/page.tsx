import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { employeeProfiles, users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-utils';
import EditForm from './EditForm';

export const metadata = { title: 'Edit Employee' };

type Props = { params: Promise<{ id: string }> };

export default async function EditEmployeePage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      name: users.name,
      role: users.role,
      active: users.active,
      firstName: employeeProfiles.firstName,
      lastName: employeeProfiles.lastName,
      photo: employeeProfiles.photo,
      position: employeeProfiles.position,
      details: employeeProfiles.details,
      salary: employeeProfiles.salary,
      salaryType: employeeProfiles.salaryType,
      hireDate: employeeProfiles.hireDate,
      notes: employeeProfiles.notes,
    })
    .from(users)
    .leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
    .where(eq(users.id, id))
    .limit(1);

  if (!row) notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/employees"
          className="text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          ← Employees
        </Link>
        <span className="text-zinc-200 dark:text-zinc-700">/</span>
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {row.name ?? row.email}
        </span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Edit employee</h1>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            row.active
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
          }`}
        >
          {row.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <EditForm employee={row} />
    </div>
  );
}
