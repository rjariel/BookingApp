'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Item = { href: string; label: string };

type Props = {
  label: string;
  items: Item[];
  /** path prefix that marks this dropdown as "active" */
  activePrefix?: string;
};

const base = 'rounded-md px-3 py-1.5 text-sm transition-colors';
const activeStyle = 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100';
const inactiveStyle =
  'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

export default function NavDropdown({ label, items, activePrefix }: Props) {
  const pathname = usePathname();
  const isActive = activePrefix
    ? pathname.startsWith(activePrefix)
    : items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <div className="group relative">
      <button type="button" className={`${base} ${isActive ? activeStyle : inactiveStyle}`}>
        {label}
        <span className="ml-1 text-[10px] opacity-50">▾</span>
      </button>
      <div className="absolute left-0 top-full z-50 hidden pt-1 group-hover:block">
        <div className="min-w-[180px] rounded-md border border-zinc-200 bg-white py-1 shadow-md dark:border-zinc-700 dark:bg-zinc-900">
          {items.map((item) => {
            const itemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 text-sm transition-colors ${
                  itemActive
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
    </div>
  );
}
