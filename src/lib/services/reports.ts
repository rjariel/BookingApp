'use server';

import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  bookings,
  cashReports,
  cashWithdrawals,
  employeeProfiles,
  expenses,
  expenseTypes,
  packages,
} from '@/db/schema';
import { PH_TIMEZONE, phDateStr } from '@/lib/timezone';

export interface ReportSummary {
  income: number;
  expenses: number;
  salaries: number;
  netProfit: number;
  forecastedIncome: number;
}

export interface PackageTally {
  packageId: string;
  packageName: string;
  count: number;
  revenue: number;
}

export interface DailyTrend {
  date: string;
  income: number;
  expenses: number;
}

/**
 * Get total income (completed + paid bookings) for a given month.
 */
export async function getMonthlyIncome(year: number, month: number): Promise<number> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const result = await db
    .select({
      total: sql<string>`COALESCE(SUM(${bookings.amountPaid}), 0)`.mapWith(Number),
    })
    .from(bookings)
    .where(
      and(
        gte(bookings.createdAt, startDate),
        lt(bookings.createdAt, endDate),
        sql`${bookings.status} IN ('completed', 'confirmed')`,
        sql`${bookings.amountPaid} > 0`,
      ),
    );

  return result[0]?.total ?? 0;
}

/**
 * Get total expenses (expenses + cash withdrawals) for a given month.
 */
export async function getMonthlyExpenses(year: number, month: number): Promise<number> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const expensesResult = await db
    .select({
      total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`.mapWith(Number),
    })
    .from(expenses)
    .where(and(gte(expenses.createdAt, startDate), lt(expenses.createdAt, endDate)));

  const startDateStr = startDate.toISOString().split('T')[0] ?? '';
  const endDateStr = endDate.toISOString().split('T')[0] ?? '';

  const withdrawalsResult = await db
    .select({
      total: sql<string>`COALESCE(SUM(${cashWithdrawals.amount}), 0)`.mapWith(Number),
    })
    .from(cashWithdrawals)
    .where(and(gte(cashWithdrawals.date, startDateStr), lt(cashWithdrawals.date, endDateStr)));

  return (expensesResult[0]?.total ?? 0) + (withdrawalsResult[0]?.total ?? 0);
}

/**
 * Calculate total salary costs for the month based on employee profiles.
 * Only counts active employees (those with salary set).
 */
export async function getMonthlySalaries(_year: number, _month: number): Promise<number> {
  const employees = await db
    .select()
    .from(employeeProfiles)
    .where(sql`${employeeProfiles.salary} IS NOT NULL`);

  let totalSalary = 0;

  for (const emp of employees) {
    if (!emp.salary) continue;

    const salary = parseFloat(emp.salary.toString());

    if (emp.salaryType === 'monthly') {
      totalSalary += salary;
    } else if (emp.salaryType === 'daily') {
      // Assume 20 working days per month
      totalSalary += salary * 20;
    } else if (emp.salaryType === 'hourly') {
      // Assume 8 hours/day, 20 days/month = 160 hours
      totalSalary += salary * 160;
    }
  }

  return totalSalary;
}

/**
 * Get bookings breakdown by package for the month.
 */
export async function getPackagesTally(year: number, month: number): Promise<PackageTally[]> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const result = await db
    .select({
      packageId: bookings.packageId,
      packageName: packages.name,
      count: sql<number>`COUNT(${bookings.id})`,
      revenue: sql<string>`COALESCE(SUM(${bookings.amountPaid}), 0)`.mapWith(Number),
    })
    .from(bookings)
    .innerJoin(packages, sql`${bookings.packageId} = ${packages.id}`)
    .where(
      and(
        gte(bookings.createdAt, startDate),
        lt(bookings.createdAt, endDate),
        sql`${bookings.status} IN ('completed', 'confirmed')`,
      ),
    )
    .groupBy(bookings.packageId, packages.name);

  return result.map((r) => ({
    packageId: r.packageId,
    packageName: r.packageName,
    count: Number(r.count),
    revenue: r.revenue,
  }));
}

/**
 * Get daily income/expense trends for the month (for charting).
 */
export async function getMonthlyTrend(year: number, month: number): Promise<DailyTrend[]> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  // Daily income
  const incomeByDay = await db
    .select({
      date: sql<string>`DATE(${bookings.createdAt})`,
      total: sql<string>`COALESCE(SUM(${bookings.amountPaid}), 0)`.mapWith(Number),
    })
    .from(bookings)
    .where(
      and(
        gte(bookings.createdAt, startDate),
        lt(bookings.createdAt, endDate),
        sql`${bookings.status} IN ('completed', 'confirmed')`,
        sql`${bookings.amountPaid} > 0`,
      ),
    )
    .groupBy(sql`DATE(${bookings.createdAt})`);

  // Daily expenses
  const expensesByDay = await db
    .select({
      date: sql<string>`${expenses.createdAt}::date`,
      total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`.mapWith(Number),
    })
    .from(expenses)
    .where(and(gte(expenses.createdAt, startDate), lt(expenses.createdAt, endDate)))
    .groupBy(sql`${expenses.createdAt}::date`);

  // Merge by date
  const trendMap = new Map<string, { income: number; expenses: number }>();

  incomeByDay.forEach((row) => {
    const entry = trendMap.get(row.date) ?? { income: 0, expenses: 0 };
    entry.income = row.total;
    trendMap.set(row.date, entry);
  });

  expensesByDay.forEach((row) => {
    const entry = trendMap.get(row.date) ?? { income: 0, expenses: 0 };
    entry.expenses = row.total;
    trendMap.set(row.date, entry);
  });

  const trend = Array.from(trendMap.entries())
    .map(([date, values]) => ({
      date,
      income: values.income,
      expenses: values.expenses,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return trend;
}

/**
 * Calculate forecasted month-end income based on daily average.
 */
export async function getMonthlyForecast(year: number, month: number): Promise<number> {
  const income = await getMonthlyIncome(year, month);
  const today = new Date();

  // Only forecast if we're in the current month
  if (today.getMonth() !== month - 1 || today.getFullYear() !== year) {
    return income;
  }

  const daysElapsed = today.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysRemaining = daysInMonth - daysElapsed;

  if (daysElapsed === 0) return 0;

  const dailyAverage = income / daysElapsed;
  const forecasted = income + dailyAverage * daysRemaining;

  return Math.round(forecasted * 100) / 100;
}

/**
 * Get complete monthly report summary.
 */
export async function getMonthlyReport(year: number, month: number): Promise<ReportSummary> {
  const [income, monthlyExpenses, salaries] = await Promise.all([
    getMonthlyIncome(year, month),
    getMonthlyExpenses(year, month),
    getMonthlySalaries(year, month),
  ]);

  const expensesPlusSalaries = monthlyExpenses + salaries;
  const netProfit = income - expensesPlusSalaries;
  const forecastedIncome = await getMonthlyForecast(year, month);

  return {
    income,
    expenses: expensesPlusSalaries,
    salaries,
    netProfit,
    forecastedIncome,
  };
}

export interface AuditExpenseItem {
  type: string;
  description: string | null;
  amount: number;
}

export interface AuditDay {
  date: string;
  dayNumber: number;
  inMonth: boolean;
  income: number;
  expenses: number;
  expenseItems: AuditExpenseItem[];
  reported: number | null;
  variance: number | null;
}

export interface MonthlyAuditCalendar {
  year: number;
  month: number;
  monthLabel: string;
  weeks: AuditDay[][];
  totals: { income: number; expenses: number; net: number; reported: number; variance: number };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Add (or subtract) whole days to a "YYYY-MM-DD" calendar date, via
 * Date.UTC/getUTC* so it's independent of the server's local timezone.
 */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, (d ?? 1) + days));
  return utc.toISOString().slice(0, 10);
}

/** Monday (PH calendar) of the week containing the given "YYYY-MM-DD" date. */
function weekStartOf(dateStr: string): string {
  // Pure calendar-date math via Date.UTC + getUTCDay — deliberately avoids
  // the server's local timezone (Date#getDay would be correct in local dev,
  // where Node happens to run in Asia/Manila, but wrong on Vercel, which
  // runs serverless functions in UTC).
  const [y, m, day] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, day ?? 1));
  const dow = utc.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = dow === 0 ? 6 : dow - 1;
  return addDays(dateStr, -diffToMonday);
}

/** Sunday (PH calendar) of the week containing the given "YYYY-MM-DD" date. */
function weekEndOf(dateStr: string): string {
  return addDays(weekStartOf(dateStr), 6);
}

/**
 * Full-month calendar (Monday–Sunday rows, PH time) audit view. Padding
 * days from the adjacent month fill out the first/last week (marked
 * `inMonth: false`) so the grid is always complete rows. Income is
 * auto-computed from bookings (packages + add-ons, any payment mode),
 * bucketed by the date each payment was taken (`createdAt`), so an advance
 * booking's deposit lands on the day it was paid. Expenses pulls every
 * Expenses-module entry regardless of type, so Shopee/Lazada purchases,
 * salary, utilities, etc. are all included, broken down per item.
 * `variance` is Reported EOD minus Income — flagged in the UI when it's
 * non-zero. Totals only count days within the selected month.
 */
export async function getMonthlyAuditCalendar(
  year: number,
  month: number,
): Promise<MonthlyAuditCalendar> {
  const monthStart = `${year}-${pad2(month)}-01`;
  const nextMonthStart = month === 12 ? `${year + 1}-01-01` : `${year}-${pad2(month + 1)}-01`;
  const lastOfMonth = addDays(nextMonthStart, -1);

  const gridStart = weekStartOf(monthStart);
  const gridEnd = weekEndOf(lastOfMonth);
  const gridEndExclusive = addDays(gridEnd, 1);

  const [bookingRows, expenseRows, reportRows] = await Promise.all([
    db
      .select({ amountPaid: bookings.amountPaid, createdAt: bookings.createdAt })
      .from(bookings)
      .where(
        and(
          sql`${bookings.status} IN ('completed','confirmed')`,
          gte(bookings.createdAt, new Date(`${gridStart}T00:00:00+08:00`)),
          lt(bookings.createdAt, new Date(`${gridEndExclusive}T00:00:00+08:00`)),
        ),
      ),
    db
      .select({
        date: expenses.spentOn,
        amount: expenses.amount,
        description: expenses.description,
        type: expenseTypes.name,
      })
      .from(expenses)
      .innerJoin(expenseTypes, eq(expenses.expenseTypeId, expenseTypes.id))
      .where(and(gte(expenses.spentOn, gridStart), lt(expenses.spentOn, gridEndExclusive))),
    db
      .select({ date: cashReports.date, amountReported: cashReports.amountReported })
      .from(cashReports)
      .where(and(gte(cashReports.date, gridStart), lt(cashReports.date, gridEndExclusive))),
  ]);

  const dailyIncome = new Map<string, number>();
  const dailyExpenses = new Map<string, number>();
  const dailyExpenseItems = new Map<string, AuditExpenseItem[]>();
  const dailyReported = new Map<string, number>();

  for (const row of bookingRows) {
    const date = phDateStr(row.createdAt);
    dailyIncome.set(date, (dailyIncome.get(date) ?? 0) + parseFloat(row.amountPaid));
  }
  for (const row of expenseRows) {
    const amount = parseFloat(row.amount);
    dailyExpenses.set(row.date, (dailyExpenses.get(row.date) ?? 0) + amount);
    const items = dailyExpenseItems.get(row.date) ?? [];
    items.push({ type: row.type, description: row.description, amount });
    dailyExpenseItems.set(row.date, items);
  }
  for (const row of reportRows) {
    dailyReported.set(
      row.date,
      (dailyReported.get(row.date) ?? 0) + parseFloat(row.amountReported),
    );
  }

  const weeks: AuditDay[][] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const week: AuditDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = cursor;
      const income = dailyIncome.get(date) ?? 0;
      const dayExpenses = dailyExpenses.get(date) ?? 0;
      const reported = dailyReported.has(date) ? (dailyReported.get(date) ?? 0) : null;
      week.push({
        date,
        dayNumber: Number(date.slice(8, 10)),
        inMonth: date >= monthStart && date <= lastOfMonth,
        income,
        expenses: dayExpenses,
        expenseItems: dailyExpenseItems.get(date) ?? [],
        reported,
        variance: reported === null ? null : reported - income,
      });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }

  const monthDays = weeks.flat().filter((d) => d.inMonth);
  const income = monthDays.reduce((sum, d) => sum + d.income, 0);
  const exp = monthDays.reduce((sum, d) => sum + d.expenses, 0);
  const reported = monthDays.reduce((sum, d) => sum + (d.reported ?? 0), 0);

  const monthLabel = new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TIMEZONE,
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${monthStart}T12:00:00+08:00`));

  return {
    year,
    month,
    monthLabel,
    weeks,
    totals: { income, expenses: exp, net: income - exp, reported, variance: reported - income },
  };
}
