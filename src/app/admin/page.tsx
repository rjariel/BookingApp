import { and, desc, eq, ne } from 'drizzle-orm';
import { Suspense } from 'react';
import { auth } from '@/auth';
import { db } from '@/db';
import { activityLog, dailyDuty, users } from '@/db/schema';
import { hasModule, requireModule } from '@/lib/permissions';
import ActivityLogTable from './_components/ActivityLogTable';
import AvailableSlots from './_components/AvailableSlots';
import LowStockList from './_components/LowStockList';
import OnDutyToday from './_components/OnDutyToday';
import SnapshotBar from './_components/SnapshotBar';
import TodaysBookings from './_components/TodaysBookings';

export const metadata = { title: 'Dashboard' };

function todayString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

async function getAllStaff() {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.active, true), ne(users.role, 'client')))
    .orderBy(users.name);
}

async function getTodaysDuty(today: string) {
  return db
    .select({
      userId: dailyDuty.userId,
      name: users.name,
    })
    .from(dailyDuty)
    .innerJoin(users, eq(dailyDuty.userId, users.id))
    .where(eq(dailyDuty.date, today))
    .orderBy(dailyDuty.createdAt);
}

async function getActivityLog() {
  const rows = await db
    .select({
      id: activityLog.id,
      createdAt: activityLog.createdAt,
      actorName: users.name,
      action: activityLog.action,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      summary: activityLog.summary,
    })
    .from(activityLog)
    .leftJoin(users, eq(activityLog.actorId, users.id))
    .orderBy(desc(activityLog.createdAt))
    .limit(200);

  return rows.map((r) => ({
    ...r,
    summary: r.summary as Record<string, unknown> | null,
  }));
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800 ${className ?? 'h-24'}`}
    />
  );
}

export default async function AdminDashboard() {
  await requireModule('dashboard');
  const session = await auth();
  const isAdmin = session?.user?.role === 'admin';
  const today = todayString();
  const canEditDuty = await hasModule('duty');

  const [activityRows, allStaff, dutyRoster] = await Promise.all([
    isAdmin ? getActivityLog() : [],
    getAllStaff(),
    getTodaysDuty(today),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8" suppressHydrationWarning>
      {/* Header with New Booking button */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {new Intl.DateTimeFormat('en-PH', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }).format(new Date())}
          </p>
        </div>
        <a
          href="/admin/bookings/new"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          + New Booking
        </a>
      </div>

      {/* Available slots + On Duty — two-column top section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-40" />}>
          <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900/30">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Available Slots Today
            </h2>
            <AvailableSlots />
          </section>
        </Suspense>

        <Suspense fallback={<Skeleton className="h-40" />}>
          <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900/30">
            <OnDutyToday
              today={today}
              allStaff={allStaff}
              currentDuty={dutyRoster.map((d) => ({
                userId: d.userId,
                name: d.name ?? 'Unknown',
              }))}
              canEdit={canEditDuty}
            />
          </section>
        </Suspense>
      </div>

      {/* Snapshot bar */}
      <Suspense fallback={<Skeleton className="h-20" />}>
        <SnapshotBar isAdmin={isAdmin} />
      </Suspense>

      {/* Two-column grid: bookings + stock */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-48" />}>
          <TodaysBookings />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-28" />}>
          <LowStockList />
        </Suspense>
      </div>

      {/* Activity log — admin only */}
      {isAdmin && (
        <Suspense fallback={<Skeleton className="h-64" />}>
          <ActivityLogTable rows={activityRows} />
        </Suspense>
      )}
    </div>
  );
}
