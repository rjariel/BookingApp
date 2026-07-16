import { and, asc, desc, eq, gte, lt, ne } from 'drizzle-orm';
import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/db';
import { dailyDuty, users } from '@/db/schema';
import { requireModule } from '@/lib/permissions';
import { phMonthStr } from '@/lib/timezone';
import MonthFilter from '../../bookings/_components/MonthFilter';
import AddDutyEntryForm from '../_components/AddDutyEntryForm';
import DutyHistoryEntryRow from '../_components/DutyHistoryEntryRow';

export const metadata = { title: 'Duty History' };

function nextMonthStr(month: string): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

type Props = {
  searchParams: Promise<{ month?: string }>;
};

export default async function DutyHistoryPage({ searchParams }: Props) {
  await requireModule('duty');
  const session = await auth();
  const isAdmin = session?.user?.role === 'admin';

  const { month: monthParam } = await searchParams;
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : phMonthStr();
  const monthStart = `${month}-01`;
  const monthEnd = `${nextMonthStr(month)}-01`;

  const allStaff = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.active, true), ne(users.role, 'client')))
    .orderBy(users.name);

  const rows = await db
    .select({
      id: dailyDuty.id,
      userId: dailyDuty.userId,
      date: dailyDuty.date,
      notes: dailyDuty.notes,
      name: users.name,
      email: users.email,
    })
    .from(dailyDuty)
    .innerJoin(users, eq(dailyDuty.userId, users.id))
    .where(and(gte(dailyDuty.date, monthStart), lt(dailyDuty.date, monthEnd)))
    .orderBy(desc(dailyDuty.date), asc(users.name));

  // Group consecutive rows by date (already sorted desc by date, so groups
  // come out newest-first without any extra sorting).
  const groups: { date: string; entries: typeof rows }[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.date === row.date) {
      last.entries.push(row);
    } else {
      groups.push({ date: row.date, entries: [row] });
    }
  }

  const monthLabel = new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${monthStart}T00:00:00`));

  const fmtDayHeading = (date: string) =>
    new Intl.DateTimeFormat('en-PH', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(new Date(`${date}T00:00:00`));

  return (
    <div className="px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/duty"
            className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← Today's duty
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Duty History
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <MonthFilter month={month} basePath="/admin/duty/history" />
          {isAdmin && <AddDutyEntryForm staff={allStaff} defaultDate={monthStart} />}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">No duty entries in {monthLabel}.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.date}>
              <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {fmtDayHeading(group.date)}
                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-zinc-500 dark:bg-zinc-800">
                  {group.entries.length} {group.entries.length === 1 ? 'person' : 'people'}
                </span>
              </h2>
              <div className="space-y-2">
                {group.entries.map((entry) => (
                  <DutyHistoryEntryRow
                    key={entry.id}
                    entry={{
                      id: entry.id,
                      userId: entry.userId,
                      date: entry.date,
                      name: entry.name ?? entry.email ?? 'Unknown',
                      email: entry.email ?? '',
                      notes: entry.notes,
                    }}
                    staff={allStaff}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
