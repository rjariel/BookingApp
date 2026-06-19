'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { ALL_MODULES, userPermissions, users } from '@/db/schema';
import { logActivity } from '@/lib/activity-log';
import { requireAdmin } from '@/lib/auth-utils';
import type { ModuleSlug } from '@/lib/permissions';

const MODULE_VALUES = [...ALL_MODULES] as [ModuleSlug, ...ModuleSlug[]];

const setPermissionsSchema = z.object({
  userId: z.string().uuid(),
  modules: z.array(z.enum(MODULE_VALUES)),
});

export async function setUserPermissions(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string }> {
  const actorId = await requireAdmin();

  const raw = {
    userId: formData.get('userId'),
    modules: formData.getAll('modules'),
  };

  const parsed = setPermissionsSchema.safeParse(raw);
  if (!parsed.success) return { error: 'Invalid input.' };

  const { userId, modules } = parsed.data;

  // Prevent modifying another admin's permissions.
  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target) return { error: 'User not found.' };
  if (target.role === 'admin') return { error: 'Cannot modify admin permissions.' };

  // Replace all permissions atomically.
  await db.transaction(async (tx) => {
    await tx.delete(userPermissions).where(eq(userPermissions.userId, userId));
    if (modules.length > 0) {
      await tx.insert(userPermissions).values(modules.map((module) => ({ userId, module })));
    }
  });

  await logActivity({
    actorId,
    action: 'set_permissions',
    entityType: 'user',
    entityId: userId,
    summary: { modules, targetName: target.name ?? target.email },
  });

  revalidatePath('/admin/settings/users');
  return {};
}

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

export async function createStaffUser(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string; userId?: string }> {
  const actorId = await requireAdmin();

  const parsed = createUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  });
  if (!parsed.success) return { error: 'Invalid input.' };

  const { name, email } = parsed.data;

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return { error: 'Email already in use.' };

  // Temporary placeholder hash — admin must set password via reset flow.
  const { hashPassword } = await import('@/lib/password');
  const tempHash = await hashPassword(crypto.randomUUID());

  const [newUser] = await db
    .insert(users)
    .values({ name, email, passwordHash: tempHash, role: 'staff' })
    .returning({ id: users.id });

  if (!newUser) return { error: 'Failed to create user.' };

  await logActivity({
    actorId,
    action: 'create_user',
    entityType: 'user',
    entityId: newUser.id,
    summary: { name, email, role: 'staff' },
  });

  revalidatePath('/admin/settings/users');
  return { userId: newUser.id };
}

export async function toggleUserActive(
  _: unknown,
  formData: FormData,
): Promise<{ error?: string }> {
  const actorId = await requireAdmin();

  const userId = formData.get('userId');
  if (typeof userId !== 'string') return { error: 'Invalid input.' };

  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target) return { error: 'User not found.' };
  if (target.role === 'admin') return { error: 'Cannot deactivate admin.' };

  await db.update(users).set({ active: !target.active }).where(eq(users.id, userId));

  await logActivity({
    actorId,
    action: target.active ? 'deactivate_user' : 'activate_user',
    entityType: 'user',
    entityId: userId,
    summary: { name: target.name ?? target.email },
  });

  revalidatePath('/admin/settings/users');
  return {};
}
