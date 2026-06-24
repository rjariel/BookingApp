'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  getMonthlyReport,
  getPackagesTally,
  getMonthlyTrend,
  type ReportSummary,
  type PackageTally,
  type DailyTrend,
} from '@/lib/services/reports';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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
        <h1 className="text-3xl font-semibold">Reports</h1>
      </div>

      {/* Month Picker */}
      <div className="flex items-center gap-4 border-b pb-4">
        <button
          onClick={handlePrevMonth}
          className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium hover:bg-zinc-200"
        >
          ← Prev
        </button>
        <span className="min-w-40 text-center text-lg font-medium">{monthLabel}</span>
        <button
          onClick={handleNextMonth}
          disabled={year === today.getFullYear() && month === today.getMonth() + 1}
          className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium hover:bg-zinc-200 disabled:opacity-50"
        >
          Next →
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : report ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card label="Income" value={`₹${report.income.toFixed(2)}`} />
            <Card
              label="Expenses & Salaries"
              value={`₹${report.expenses.toFixed(2)}`}
              secondary
            />
            <Card label="Net Profit" value={`₹${report.netProfit.toFixed(2)}`} />
            <Card
              label="Forecasted (EOD)"
              value={`₹${report.forecastedIncome.toFixed(2)}`}
              secondary
            />
          </div>

          {/* Trend Chart */}
          {trend.length > 0 && (
            <div className="rounded-lg border bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold">Income vs Expenses Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip
                    formatter={(value) =>
                      typeof value === 'number' ? [`₹${value.toFixed(2)}`] : [String(value ?? '')]
                    }
                    labelStyle={{ color: '#000' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Packages Tally */}
          {packages.length > 0 && (
            <div className="rounded-lg border bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold">Packages Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-2 text-left font-medium">Package</th>
                      <th className="px-4 py-2 text-right font-medium">Count</th>
                      <th className="px-4 py-2 text-right font-medium">Revenue</th>
                      <th className="px-4 py-2 text-right font-medium">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map((pkg) => (
                      <tr key={pkg.packageId} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{pkg.packageName}</td>
                        <td className="px-4 py-2 text-right">{pkg.count}</td>
                        <td className="px-4 py-2 text-right">₹{pkg.revenue.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">
                          ₹{(pkg.revenue / pkg.count).toFixed(2)}
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
      className={`rounded-lg border p-4 ${secondary ? 'bg-gray-50' : 'bg-white'}`}
    >
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
