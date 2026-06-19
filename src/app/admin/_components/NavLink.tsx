'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Props = {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
};

const base = 'rounded-md px-3 py-1.5 text-sm transition-colors';
const active = 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100';
const inactive =
  'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

export default function NavLink({ href, children, exact = false }: Props) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} className={`${base} ${isActive ? active : inactive}`}>
      {children}
    </Link>
  );
}
