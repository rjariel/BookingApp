'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/db';
import { ALL_MODULES, rolePermissions, roles, users } from '@/db/schema';
import { logActivity } from '@/lib/activity-log';
import { requireAdmin } from '@/lib/auth-utils';
import type { ModuleSlug } from '@/lib/permissions';

const MODULE_VALUES = [...ALL_MODULES] as [ModuleSlug, ...ModuleSlug[]];

const roleSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only.'),
  description: z.string().max(200).optional(),
  baseRole: z.enum(['admin', 'staff', 'client']),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color.')
    .default('#6b7280'),
  modules: z.array(z.enum(MODULE_VALUES)).default([]),
});

// ── Create ────────────────────────────────────────────────────────────────

export async function createRole(_: unknown, formData: FormData): Promise<{ error?: string }> {
  const actorId = await requireAdmin();

  const raw = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description') || undefined,
    baseRole: formData.get('baseRole'),
    color: formData.get('color') || '#6b7280',
    modules: formData.getAll('modules'),
  };

  const parsed = roleSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { name, slug, description, baseRole, color, modules } = parsed.data;

  const existing = await db.query.roles.findFirst({ where: eq(roles.slug, slug) });
  if (existing) return { error: 'A role with that slug already exists.' };

  const [newRole] = await db
    .insert(roles)
    .values({ name, slug, description, baseRole, color, isSystem: false })
    .returning({ id: roles.id });

  if (!newRole) return { error: 'Failed to create role.' };

  if (modules.length > 0) {
    await db
      .insert(rolePermissions)
      .values(modules.map((module) => ({ roleId: newRole.id, module })));
  }

  await logActivity({
    actorId,
    action: 'create_role',
    entityType: 'role',
    entityId: newRole.id,
    summary: { name, slug, baseRole, modules },
  });

  revalidatePath('/admin/settings/roles');
  redirect('/admin/settings/roles');
}

// ── Update ────────────────────────────────────────────────────────────────

export async function updateRole(
  roleId: string,
  _: unknown,
  formData: FormData,
): Promise<{ error?: string }> {
  const actorId = await requireAdmin();

  const target = await db.query.roles.findFirst({ where: eq(roles.id, roleId) });
  if (!target) return { error: 'Role not found.' };

  const raw = {
    name: formData.get('name'),
    slug: target.isSystem ? target.slug : formData.get('slug'), // system roles: slug is immutable
    description: formData.get('description') || undefined,
    baseRole: target.isSystem ? target.baseRole : formData.get('baseRole'), // system: base immutable
    color: formData.get('color') || '#6b7280',
    modules: formData.getAll('modules'),
  };

  const parsed = roleSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { name, slug, description, baseRole, color, modules } = parsed.data;

  // Check slug uniqueness if it changed
  if (slug !== target.slug) {
    const conflict = await db.query.roles.findFirst({ where: eq(roles.slug, slug) });
    if (conflict) return { error: 'A role with that slug already exists.' };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(roles)
      .set({ name, slug, description, baseRole, color })
      .where(eq(roles.id, roleId));
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (modules.length > 0) {
      await tx.insert(rolePermissions).values(modules.map((module) => ({ roleId, module })));
    }
  });

  await logActivity({
    actorId,
    action: 'update_role',
    entityType: 'role',
    entityId: roleId,
    summary: { name, modules },
  });

  revalidatePath('/admin/settings/roles');
  revalidatePath(`/admin/settings/roles/${roleId}`);
  return {};
}

// ── Delete ────────────────────────────────────────────────────────────────

export async function deleteRole(_: unknown, formData: FormData): Promise<{ error?: string }> {
  const actorId = await requireAdmin();

  const roleId = formData.get('roleId');
  if (typeof roleId !== 'string') return { error: 'Invalid input.' };

  const target = await db.query.roles.findFirst({ where: eq(roles.id, roleId) });
  if (!target) return { error: 'Role not found.' };
  if (target.isSystem) return { error: 'System roles cannot be deleted.' };

  // Re-assign affected users to the appropriate system role
  const [fallback] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.slug, 'staff'), eq(roles.isSystem, true)))
    .limit(1);

  if (fallback) {
    await db.update(users).set({ roleId: fallback.id }).where(eq(users.roleId, roleId));
  }

  await db.delete(roles).where(eq(roles.id, roleId));

  await logActivity({
    actorId,
    action: 'delete_role',
    entityType: 'role',
    entityId: roleId,
    summary: { name: target.name },
  });

  revalidatePath('/admin/settings/roles');
  redirect('/admin/settings/roles');
}

// ── Assign role to user ───────────────────────────────────────────────────

export async function assignUserRole(_: unknown, formData: FormData): Promise<{ error?: string }> {
  const actorId = await requireAdmin();

  const userId = formData.get('userId');
  const roleId = formData.get('roleId');

  if (typeof userId !== 'string' || typeof roleId !== 'string') {
    return { error: 'Invalid input.' };
  }

  const [targetUser, targetRole] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db.query.roles.findFirst({ where: eq(roles.id, roleId) }),
  ]);

  if (!targetUser) return { error: 'User not found.' };
  if (!targetRole) return { error: 'Role not found.' };
  if (targetUser.role === 'admin' && targetRole.baseRole !== 'admin') {
    return { error: 'Cannot demote an admin user via role assignment.' };
  }

  // Keep users.role in sync with the role's baseRole
  await db.update(users).set({ roleId, role: targetRole.baseRole }).where(eq(users.id, userId));

  await logActivity({
    actorId,
    action: 'assign_role',
    entityType: 'user',
    entityId: userId,
    summary: { roleName: targetRole.name, targetName: targetUser.name ?? targetUser.email },
  });

  revalidatePath('/admin/settings/users');
  return {};
}
