'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type NavItem = { href: string; label: string };
type NavGroup = { label?: string; items: NavItem[] };

type Props = {
  navGroups: NavGroup[];
  settingsItems: NavItem[];
  userName: string;
  isAdmin: boolean;
  studioName: string;
  logoUrl?: string | null;
  signOutAction: () => Promise<void>;
  showRoadmap?: boolean;
};

export default function MobileNav({
  navGroups,
  settingsItems,
  userName,
  isAdmin,
  studioName,
  logoUrl,
  signOutAction,
  showRoadmap = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const linkBase =
    'flex items-center rounded-md px-3 py-2 text-sm transition-colors';
  const linkActive =
    'bg-zinc-100 text-zinc-900 font-medium dark:bg-zinc-800 dark:text-zinc-100';
  const linkInactive =
    'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100';

  return (
    <>
      {/* Burger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <rect y="3" width="18" height="1.5" rx="0.75" fill="currentColor" />
          <rect y="8.25" width="18" height="1.5" rx="0.75" fill="currentColor" />
          <rect y="13.5" width="18" height="1.5" rx="0.75" fill="currentColor" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-xl transition-transform duration-200 ease-out dark:bg-zinc-950 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-modal="true"
        role="dialog"
        aria-label="Navigation menu"
      >
        {/* Drawer header */}
        <div className="flex h-12 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={studioName}
                className="h-6 w-6 rounded object-contain"
              />
            )}
            <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {studioName}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M1 1L13 13M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Nav content */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {navGroups.map((group, idx) => (
            <div key={idx} className="mb-4">
              {group.label && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${linkBase} ${
                      isActive(item.href, item.href === '/admin') ? linkActive : linkInactive
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {settingsItems.length > 0 && (
            <div className="mb-4">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Settings
              </p>
              <div className="flex flex-col gap-0.5">
                {settingsItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${linkBase} ${isActive(item.href) ? linkActive : linkInactive}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {showRoadmap && (
            <div className="mb-4">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Admin
              </p>
              <div className="flex flex-col gap-0.5">
                <Link
                  href="/admin/roadmap"
                  className={`${linkBase} ${isActive('/admin/roadmap') ? linkActive : linkInactive}`}
                >
                  Roadmap
                </Link>
              </div>
            </div>
          )}
        </nav>

        {/* Drawer footer */}
        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {userName}
              </p>
              {isAdmin && (
                <p className="text-[10px] text-zinc-400">Admin</p>
              )}
            </div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-md border border-zinc-200 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
