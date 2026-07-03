import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/db';
import { employeeProfiles, users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-utils';
import { requireModule } from '@/lib/permissions';

export const metadata = { title: 'Employees' };

const SALARY_SUFFIX = { monthly: '/mo', daily: '/day', hourly: '/hr' } as const;

function fmtSalary(salary: string | null, type: string | null) {
  if (!salary) return null;
  const num = parseFloat(salary).toLocaleString('en-PH', { minimumFractionDigits: 2 });
  const suffix = type ? (SALARY_SUFFIX[type as keyof typeof SALARY_SUFFIX] ?? '') : '';
  return `₱${num}${suffix}`;
}

export default async function EmployeesPage() {
  await requireModule('employees');
  await requireAdmin();

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      active: users.active,
      photo: employeeProfiles.photo,
      firstName: employeeProfiles.firstName,
      lastName: employeeProfiles.lastName,
      position: employeeProfiles.position,
      salary: employeeProfiles.salary,
      salaryType: employeeProfiles.salaryType,
      hireDate: employeeProfiles.hireDate,
    })
    .from(users)
    .leftJoin(employeeProfiles, eq(employeeProfiles.userId, users.id))
    .orderBy(users.role, users.name);

  const displayName = (r: (typeof rows)[number]) =>
    r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : (r.name ?? r.email);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Employees</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {rows.length} {rows.length === 1 ? 'person' : 'people'}
          </p>
        </div>
        <Link
          href="/admin/employees/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:opacity-80 dark:bg-zinc-100 dark:text-zinc-900"
        >
          + Add employee
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">No employees yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
          {rows.map((r, i) => {
            const name = displayName(r);
            const salary = fmtSalary(r.salary, r.salaryType);
            return (
              <Link
                key={r.id}
                href={`/admin/employees/${r.id}`}
                className={`flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                  i > 0 ? 'border-t border-zinc-100 dark:border-zinc-800' : ''
                }`}
              >
                {/* Avatar */}
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  {r.photo ? (
                    // biome-ignore lint/performance/noImgElement: arbitrary uploaded/data-URL photo, not a next/image-optimizable static asset
                    <img src={r.photo} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {name}
                    </p>
                    {!r.active && (
                      <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-zinc-400">
                    {r.position ? `${r.position} · ` : ''}
                    {r.email}
                  </p>
                </div>

                {/* Salary — admin sees it in the list */}
                <div className="shrink-0 text-right">
                  {salary ? (
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{salary}</p>
                  ) : (
                    <p className="text-xs text-zinc-300 dark:text-zinc-600">—</p>
                  )}
                  {r.role === 'admin' && <p className="text-xs text-zinc-400">Admin</p>}
                </div>

                <svg
                  className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
