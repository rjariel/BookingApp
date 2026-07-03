'use server';

import { and, gte, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { bookings, cashWithdrawals, employeeProfiles, expenses, packages } from '@/db/schema';

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
