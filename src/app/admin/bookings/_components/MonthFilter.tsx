'use client';

import { useRouter } from 'next/navigation';

export default function MonthFilter({
  month,
  basePath = '/admin/bookings',
}: {
  month: string;
  basePath?: string;
}) {
  const router = useRouter();

  return (
    <input
      type="month"
      value={month}
      onChange={(e) => {
        if (e.target.value) router.push(`${basePath}?month=${e.target.value}`);
      }}
      className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
    />
  );
}
