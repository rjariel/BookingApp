import { redirect } from 'next/navigation';
import { signOut } from '@/auth';
import type { ModuleSlug } from '@/lib/permissions';
import { getSessionWithModules } from '@/lib/permissions';
import { getStudioProfile } from '@/lib/store-settings';
import MobileNav from './_components/MobileNav';
import NavDropdown from './_components/NavDropdown';
import NavLink from './_components/NavLink';
import SettingsDropdown from './_components/SettingsDropdown';

type NavItem = { href: string; label: string; module: ModuleSlug };
type NavGroup = { label?: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ href: '/admin', label: 'Dashboard', module: 'dashboard' }],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/bookings', label: 'Bookings', module: 'bookings' },
      { href: '/admin/inventory', label: 'Inventory', module: 'inventory' },
      { href: '/admin/packages', label: 'Packages', module: 'packages' },
      { href: '/admin/addons', label: 'Add-ons', module: 'addons' },
      { href: '/admin/employees', label: 'Employees', module: 'employees' },
      { href: '/admin/duty', label: 'Duty', module: 'duty' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/admin/expenses', label: 'Expenses', module: 'expenses' },
      { href: '/admin/cashflow', label: 'Cash Flow', module: 'cashflow' },
      { href: '/admin/reports', label: 'Reports', module: 'cashflow' },
    ],
  },
];

const SETTINGS_ITEMS: NavItem[] = [
  { href: '/admin/settings/studio', label: 'Studio Profile', module: 'settings' },
  { href: '/admin/settings/store-hours', label: 'Store Hours', module: 'settings' },
  { href: '/admin/settings/payment-modes', label: 'Payment Modes', module: 'payment_modes' },
  { href: '/admin/settings/expense-types', label: 'Expense Types', module: 'expense_types' },
  { href: '/admin/settings/users', label: 'User Permissions', module: 'settings' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionWithModules();
  if (!ctx) redirect('/login');

  const { user, modules } = ctx;
  const isAdmin = user.role === 'admin';
  const studio = await getStudioProfile();

  const visibleNavGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => modules.has(item.module)),
  })).filter((group) => group.items.length > 0);

  const visibleSettings = SETTINGS_ITEMS.filter((item) => modules.has(item.module));

  const signOutAction = async () => {
    'use server';
    await signOut({ redirectTo: '/login' });
  };

  return (
    <div className="flex min-h-full flex-col">
      {/* Top nav */}
      <header className="flex h-12 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950">
        {/* Left: burger (mobile) + logo + desktop nav */}
        <div className="flex items-center gap-3 md:gap-6">
          {/* Burger — mobile only */}
          <div className="md:hidden">
            <MobileNav
              navGroups={visibleNavGroups}
              settingsItems={visibleSettings}
              userName={user.name ?? user.email ?? ''}
              isAdmin={isAdmin}
              studioName={studio.studioName}
              logoUrl={studio.logoUrl}
              signOutAction={signOutAction}
              showRoadmap={isAdmin}
            />
          </div>

          {/* Logo + studio name */}
          <div className="flex items-center gap-2">
            {studio.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={studio.logoUrl}
                alt={studio.studioName}
                className="h-6 w-6 rounded object-contain"
              />
            )}
            <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {studio.studioName}
            </span>
          </div>

          {/* Desktop nav — hidden on mobile */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {visibleNavGroups.map((group, idx) =>
              group.label ? (
                <NavDropdown key={idx} label={group.label} items={group.items} />
              ) : (
                group.items.map((item) => (
                  <NavLink key={item.href} href={item.href} exact={item.href === '/admin'}>
                    {item.label}
                  </NavLink>
                ))
              ),
            )}
            {visibleSettings.length > 0 && <SettingsDropdown items={visibleSettings} />}
            {isAdmin && (
              <NavLink href="/admin/roadmap">Roadmap</NavLink>
            )}
          </nav>
        </div>

        {/* Right: user info + sign out — desktop only */}
        <div className="hidden items-center gap-3 md:flex">
          <span className="text-xs text-zinc-500">
            {user.name ?? user.email}
            {isAdmin && (
              <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800">
                admin
              </span>
            )}
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
