'use client';

import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  type DailyTrend,
  getMonthlyAuditCalendar,
  getMonthlyReport,
  getMonthlyTrend,
  getPackagesTally,
  type MonthlyAuditCalendar,
  type PackageTally,
  type ReportSummary,
} from '@/lib/services/reports';

// Last 12 months (current first), for the audit calendar's month dropdown.
function recentMonthOptions(): { year: number; month: number; label: string }[] {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' });
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: fmt.format(d) };
  });
}

export function ReportsClient() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [packages, setPackages] = useState<PackageTally[]>([]);
  const [trend, setTrend] = useState<DailyTrend[]>([]);

  const monthOptions = recentMonthOptions();
  const [auditPeriod, setAuditPeriod] = useState(
    () => `${today.getFullYear()}-${today.getMonth() + 1}`,
  );
  const [calendar, setCalendar] = useState<MonthlyAuditCalendar | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [reportData, packagesData, trendData] = await Promise.all([
        getMonthlyReport(year, month),
        getPackagesTally(year, month),
        getMonthlyTrend(year, month),
      ]);
      setReport(reportData);
      setPackages(packagesData);
      setTrend(trendData);
      setLoading(false);
    };

    fetchData();
  }, [year, month]);

  // Audit calendar has its own month selector, independent of the picker above.
  useEffect(() => {
    const [y, m] = auditPeriod.split('-').map(Number);
    if (!y || !m) return;
    getMonthlyAuditCalendar(y, m).then(setCalendar);
  }, [auditPeriod]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const monthLabel = format(new Date(year, month - 1), 'MMMM yyyy');

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">Reports</h1>
      </div>

      {/* Month Picker */}
      <div className="flex items-center gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          ← Prev
        </button>
        <span className="min-w-40 text-center text-lg font-medium text-zinc-900 dark:text-zinc-100">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          disabled={year === today.getFullYear() && month === today.getMonth() + 1}
          className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          Next →
        </button>
      </div>

      {loading ? (
        <div className="text-center text-zinc-500 dark:text-zinc-400">Loading...</div>
      ) : report ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card label="Income" value={`₱${report.income.toFixed(2)}`} />
            <Card label="Expenses & Salaries" value={`₱${report.expenses.toFixed(2)}`} secondary />
            <Card label="Net Profit" value={`₱${report.netProfit.toFixed(2)}`} />
            <Card
              label="Forecasted (EOD)"
              value={`₱${report.forecastedIncome.toFixed(2)}`}
              secondary
            />
          </div>

          {/* Trend Chart */}
          {trend.length > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Income vs Expenses Trend
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#a1a1aa" strokeOpacity={0.4} />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 12 }} stroke="#a1a1aa" />
                  <YAxis tick={{ fill: '#71717a', fontSize: 12 }} stroke="#a1a1aa" />
                  <Tooltip
                    formatter={(value) =>
                      typeof value === 'number' ? [`₱${value.toFixed(2)}`] : [String(value ?? '')]
                    }
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #d4d4d8',
                      borderRadius: '6px',
                    }}
                    labelStyle={{ color: '#18181b', fontWeight: 600 }}
                    itemStyle={{ color: '#18181b' }}
                  />
                  <Legend wrapperStyle={{ color: '#71717a' }} />
                  <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Weekly audit report */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Audit calendar
              </h2>
              <select
                value={auditPeriod}
                onChange={(e) => setAuditPeriod(e.target.value)}
                className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
              >
                {monthOptions.map((o) => (
                  <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="mb-4 text-xs text-zinc-500">
              Independent of the month picker above. <AutoIcon className="mx-0.5" /> Income is
              auto-computed from bookings; Expenses includes every Expenses-module entry (Shopee,
              salary, utilities, etc.), itemized. Flagged when Reported EOD doesn't match Income.
            </p>

            {!calendar ? (
              <p className="text-sm text-zinc-400">Loading…</p>
            ) : (
              <>
                {/* Month summary strip */}
                <div className="mb-5 flex flex-wrap items-center gap-6 rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <SummaryStat label="Income" value={fmt(calendar.totals.income)} />
                  <SummaryStat
                    label="Expenses"
                    value={
                      calendar.totals.expenses > 0 ? `−${fmt(calendar.totals.expenses)}` : fmt(0)
                    }
                  />
                  <SummaryStat label="Net" value={fmt(calendar.totals.net)} bold />
                  <SummaryStat label="Reported EOD" value={fmt(calendar.totals.reported)} />
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Flag</p>
                    {issueFlag(calendar.totals.variance)}
                  </div>
                  {Math.abs(calendar.totals.variance) >= 0.01 && (
                    <p className="max-w-xs text-xs text-zinc-500">
                      {flagNote(calendar.totals.variance)}
                    </p>
                  )}
                </div>

                {/* Calendar grid — Monday through Sunday columns, one row per week */}
                <div className="overflow-x-auto">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-7 gap-2 mb-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                        <p
                          key={d}
                          className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wide"
                        >
                          {d}
                        </p>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {calendar.weeks.map((week) => (
                        <div key={week[0]?.date} className="grid grid-cols-7 gap-2">
                          {week.map((d) => {
                            const flagged = d.variance !== null && Math.abs(d.variance) >= 0.01;
                            return (
                              <div
                                key={d.date}
                                className={`rounded-lg border p-2.5 ${
                                  !d.inMonth
                                    ? 'border-zinc-100 bg-zinc-50/50 opacity-50 dark:border-zinc-800/50 dark:bg-zinc-900/20'
                                    : flagged
                                      ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/10'
                                      : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50'
                                }`}
                              >
                                <p className="mb-1.5 text-xs font-medium text-zinc-500">
                                  {d.dayNumber}
                                </p>
                                {d.inMonth && (
                                  <div className="space-y-1 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="inline-flex items-center gap-1 text-zinc-500">
                                        <AutoIcon /> Income
                                      </span>
                                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                        {fmt(d.income)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-zinc-500">Expenses</span>
                                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                        {d.expenses > 0 ? `−${fmt(d.expenses)}` : fmt(0)}
                                      </span>
                                    </div>
                                    {d.expenseItems.length > 0 && (
                                      <div className="ml-2 space-y-0.5 border-l border-zinc-200 pl-2 dark:border-zinc-700">
                                        {d.expenseItems.map((item, i) => (
                                          <div
                                            // biome-ignore lint/suspicious/noArrayIndexKey: expense items have no stable id here
                                            key={`${item.type}-${i}`}
                                            className="flex items-center justify-between text-zinc-400"
                                            title={item.description ?? undefined}
                                          >
                                            <span className="truncate">{item.type}</span>
                                            <span className="shrink-0">−{fmt(item.amount)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                      <span className="text-zinc-500">Reported</span>
                                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                        {d.reported !== null ? (
                                          fmt(d.reported)
                                        ) : (
                                          <span className="font-normal text-zinc-400">—</span>
                                        )}
                                      </span>
                                    </div>
                                    {flagged && (
                                      <div className="pt-0.5" title={flagNote(d.variance ?? 0)}>
                                        <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                          ⚠ {d.variance !== null && d.variance > 0 ? '+' : '−'}
                                          {fmt(Math.abs(d.variance ?? 0))}
                                        </p>
                                        <p className="text-[11px] leading-tight text-red-500/80 dark:text-red-400/70">
                                          {flagNote(d.variance ?? 0)}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Packages Tally */}
          {packages.length > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Packages Breakdown
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                      <th className="px-4 py-2 text-left font-medium text-zinc-600 dark:text-zinc-400">
                        Package
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-zinc-600 dark:text-zinc-400">
                        Count
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-zinc-600 dark:text-zinc-400">
                        Revenue
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-zinc-600 dark:text-zinc-400">
                        Avg
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map((pkg) => (
                      <tr
                        key={pkg.packageId}
                        className="border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                      >
                        <td className="px-4 py-2 text-zinc-800 dark:text-zinc-200">
                          {pkg.packageName}
                        </td>
                        <td className="px-4 py-2 text-right text-zinc-800 dark:text-zinc-200">
                          {pkg.count}
                        </td>
                        <td className="px-4 py-2 text-right text-zinc-800 dark:text-zinc-200">
                          ₱{pkg.revenue.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right text-zinc-800 dark:text-zinc-200">
                          ₱{(pkg.revenue / pkg.count).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function Card({
  label,
  value,
  secondary = false,
}: {
  label: string;
  value: string;
  secondary?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 ${
        secondary ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'bg-white dark:bg-zinc-900'
      }`}
    >
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}

const fmt = (v: number) => `₱${v.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

function SummaryStat({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <p
        className={`text-sm ${bold ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}
      >
        {value}
      </p>
    </div>
  );
}

// Marks a figure as computed automatically from booking data, as opposed to
// manually entered/self-reported by staff.
function AutoIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`inline-block h-3 w-3 text-amber-500 dark:text-amber-400 ${className}`}
      aria-hidden="true"
    >
      <title>Automated</title>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

// Issue flag for the weekly audit table — "misaligned money" when what
// staff reported (EOD) doesn't match what the system computed from bookings.
function issueFlag(variance: number) {
  if (Math.abs(variance) < 0.01) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
        ✓ OK
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-950/30 dark:text-red-400">
      ⚠ {variance > 0 ? '+' : '−'}
      {fmt(Math.abs(variance))}
    </span>
  );
}

// Short explanation for why a flag likely appeared. Reported EOD usually
// runs *higher* than Income because Income only counts booking revenue
// (packages + add-ons) — it has no visibility into walk-in print sales,
// frame sales, or anything else sold outside a formal booking, which staff
// still correctly count as cash on hand. A flag isn't proof of a shortfall;
// it's a prompt to check what the extra (or missing) cash was for.
function flagNote(variance: number): string {
  if (variance > 0) {
    return 'Reported EOD is higher than Income. Likely a non-booking sale (walk-in prints, frames, etc.) that Income doesn’t track — not necessarily a shortfall.';
  }
  return 'Reported EOD is lower than Income. Worth checking: a missed/incomplete cash count, or a booking payment that wasn’t actually collected yet.';
}
