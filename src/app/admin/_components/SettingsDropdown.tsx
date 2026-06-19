'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Item = { href: string; label: string };

const base = 'rounded-md px-3 py-1.5 text-sm transition-colors';
const active = 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100';
const inactive =
  'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

export default function SettingsDropdown({ items }: { items: Item[] }) {
  const pathname = usePathname();
  const isSettingsActive = pathname.startsWith('/admin/settings');

  return (
    <div className="group relative">
      <button type="button" className={`${base} ${isSettingsActive ? active : inactive}`}>
        Settings
      </button>
      <div className="absolute left-0 top-full z-50 mt-1 hidden min-w-[180px] rounded-md border border-zinc-200 bg-white py-1 shadow-md group-hover:block dark:border-zinc-700 dark:bg-zinc-900">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
