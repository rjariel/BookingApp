'use client';

import { useRouter } from 'next/navigation';

export default function DateFilter({
  date,
  basePath = '/admin',
}: {
  date: string;
  basePath?: string;
}) {
  const router = useRouter();

  return (
    <input
      type="date"
      value={date}
      onChange={(e) => {
        if (e.target.value) router.push(`${basePath}?date=${e.target.value}`);
      }}
      className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
    />
  );
}
