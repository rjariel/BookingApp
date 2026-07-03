'use client';

import { useMemo, useState } from 'react';
import { PH_TIMEZONE } from '@/lib/timezone';

type LogRow = {
  id: string;
  createdAt: Date;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: Record<string, unknown> | null;
};

const fmtDateTime = new Intl.DateTimeFormat('en-PH', {
  timeZone: PH_TIMEZONE,
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export default function ActivityLogTable({ rows }: { rows: LogRow[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.action.toLowerCase().includes(q) ||
        r.entityType.toLowerCase().includes(q) ||
        (r.actorName ?? '').toLowerCase().includes(q) ||
        (r.entityId ?? '').toLowerCase().includes(q) ||
        JSON.stringify(r.summary ?? {})
          .toLowerCase()
          .includes(q),
    );
  }, [rows, query]);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Activity log</h2>
        <input
          type="search"
          placeholder="Filter…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-7 rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 py-8 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-400">
            {rows.length === 0 ? 'No activity yet.' : 'No results match your filter.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                {['Time', 'Actor', 'Action', 'Entity', 'Details'].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-zinc-500">
                    {fmtDateTime.format(row.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {row.actorName ?? <span className="text-zinc-400">system</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100">
                    {row.action}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">
                    {row.entityType}
                    {row.entityId && (
                      <span className="ml-1 font-mono text-zinc-400">
                        {row.entityId.slice(0, 8)}
                      </span>
                    )}
                  </td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-xs text-zinc-400">
                    {row.summary ? JSON.stringify(row.summary) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
