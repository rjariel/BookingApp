import 'server-only';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { ALL_MODULES, roles } from '@/db/schema';

export type ModuleSlug = (typeof ALL_MODULES)[number];

/**
 * Returns the set of modules the given user can access.
 *
 * Resolution order:
 * 1. If the user has a roleId → load role_permissions for that role.
 *    If base_role = 'admin' the role implicitly gets all modules.
 * 2. Fallback (no roleId): admin base role gets all; staff gets STAFF_DEFAULT_MODULES.
 */
export async function getUserModules(
  _userId: string,
  role: string,
  roleId?: string | null,
): Promise<Set<ModuleSlug>> {
  // Fast path — admin base role
  if (role === 'admin' && !roleId) {
    return new Set(ALL_MODULES);
  }

  if (roleId) {
    const roleRow = await db.query.roles.findFirst({
      where: eq(roles.id, roleId),
      with: { permissions: true },
    });

    if (roleRow) {
      // Admin-tier roles always get everything regardless of stored permissions
      if (roleRow.baseRole === 'admin') return new Set(ALL_MODULES);
      return new Set(roleRow.permissions.map((p) => p.module as ModuleSlug));
    }
  }

  // Legacy fallback (no role assigned yet)
  if (role === 'admin') return new Set(ALL_MODULES);
  return new Set(STAFF_DEFAULT_MODULES);
}

/** Modules staff get by default when no role is assigned (backward compat). */
export const STAFF_DEFAULT_MODULES: ModuleSlug[] = [
  'dashboard',
  'bookings',
  'inventory',
  'packages',
  'addons',
  'cashflow',
  'duty',
];

/**
 * Quick boolean check — does the current session user have access to a module?
 */
export async function hasModule(module: ModuleSlug): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  const allowed = await getUserModules(
    session.user.id,
    session.user.role ?? 'staff',
    session.user.roleId,
  );
  return allowed.has(module);
}

/**
 * Hard gate for Server Actions and RSC pages.
 * Redirects to /admin/forbidden if the user lacks the module.
 */
export async function requireModule(module: ModuleSlug): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const allowed = await getUserModules(
    session.user.id,
    session.user.role ?? 'staff',
    session.user.roleId,
  );
  if (!allowed.has(module)) redirect('/admin/forbidden');

  return session.user.id;
}

/**
 * Returns session user + their permitted modules.
 * Useful in layouts that need both for nav filtering.
 */
export async function getSessionWithModules() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const modules = await getUserModules(
    session.user.id,
    session.user.role ?? 'staff',
    session.user.roleId,
  );
  return { user: session.user, modules };
}
