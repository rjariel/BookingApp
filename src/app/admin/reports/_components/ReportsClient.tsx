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
  getMonthlyReport,
  getMonthlyTrend,
  getPackagesTally,
  type PackageTally,
  type ReportSummary,
} from '@/lib/services/reports';

export function ReportsClient() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [packages, setPackages] = useState<PackageTally[]>([]);
  const [trend, setTrend] = useState<DailyTrend[]>([]);

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
