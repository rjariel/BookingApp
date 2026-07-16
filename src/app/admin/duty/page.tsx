import { and, eq, ne } from 'drizzle-orm';
import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/db';
import { dailyDuty, users } from '@/db/schema';
import { requireModule } from '@/lib/permissions';
import { phDateStr } from '@/lib/timezone';
import AdminAddForm from './_components/AdminAddForm';
import DutyCheckboxForm from './_components/DutyCheckboxForm';
import DutyRoster from './_components/DutyRoster';

export const metadata = { title: 'Daily Duty' };

export default async function DutyPage() {
  await requireModule('duty');
  const session = await auth();
  const isAdmin = session?.user?.role === 'admin';

  const today = phDateStr();

  // All active non-client users
  const allStaff = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.active, true), ne(users.role, 'client')))
    .orderBy(users.name);

  // Today's duty roster
  const roster = await db
    .select({
      id: dailyDuty.id,
      userId: dailyDuty.userId,
      notes: dailyDuty.notes,
      name: users.name,
      email: users.email,
    })
    .from(dailyDuty)
    .innerJoin(users, eq(dailyDuty.userId, users.id))
    .where(eq(dailyDuty.date, today))
    .orderBy(dailyDuty.createdAt);

  const rosterUserIds = new Set(roster.map((r) => r.userId));
  const remainingStaff = allStaff.filter((u) => !rosterUserIds.has(u.id));

  const fmt = new Date(`${today}T00:00:00`).toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const rosterSubmitted = roster.length > 0;

  return (
    <div className="px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Daily Duty</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{fmt}</p>
        </div>
        <Link
          href="/admin/duty/history"
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          View history
        </Link>
      </div>

      {!rosterSubmitted ? (
        /* ── No roster yet: show checkbox form ── */
        allStaff.length === 0 ? (
          <p className="text-sm text-zinc-400">No active staff found.</p>
        ) : (
          <DutyCheckboxForm today={today} staff={allStaff} />
        )
      ) : (
        /* ── Roster submitted: show it ── */
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              On Duty — {roster.length} {roster.length === 1 ? 'person' : 'people'}
            </h2>
            {isAdmin && <span className="text-xs text-zinc-400">Admin · editable</span>}
          </div>

          <DutyRoster
            entries={roster.map((r) => ({
              id: r.id,
              userId: r.userId,
              name: r.name ?? r.email ?? 'Unknown',
              email: r.email ?? '',
              notes: r.notes,
            }))}
            isAdmin={isAdmin}
          />

          {/* Admin can add missing staff */}
          {isAdmin && <AdminAddForm today={today} remainingStaff={remainingStaff} />}
        </>
      )}
    </div>
  );
}
