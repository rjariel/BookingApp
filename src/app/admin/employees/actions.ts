'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/db';
import { employeeProfiles, users } from '@/db/schema';
import { logActivity } from '@/lib/activity-log';
import { requireAdmin } from '@/lib/auth-utils';
import { hashPassword } from '@/lib/password';

// ── Create employee ────────────────────────────────────────────────────

const createSchema = z.object({
  firstName: z.string().min(1, 'First name required').max(80),
  lastName: z.string().min(1, 'Last name required').max(80),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  position: z.string().max(100).optional(),
  details: z.string().max(1000).optional(),
  salary: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
  salaryType: z.enum(['monthly', 'daily', 'hourly']).default('monthly'),
  hireDate: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
  notes: z.string().max(500).optional(),
  photo: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
});

export async function createEmployee(_prev: unknown, formData: FormData) {
  const actorId = await requireAdmin();

  const parsed = createSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    password: formData.get('password'),
    position: formData.get('position') ?? undefined,
    details: formData.get('details') ?? undefined,
    salary: formData.get('salary') ?? undefined,
    salaryType: formData.get('salaryType') ?? 'monthly',
    hireDate: formData.get('hireDate') ?? undefined,
    notes: formData.get('notes') ?? undefined,
    photo: formData.get('photo') ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const {
    firstName,
    lastName,
    email,
    password,
    position,
    details,
    salary,
    salaryType,
    hireDate,
    notes,
    photo,
  } = parsed.data;

  // Check email uniqueness
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) return { error: 'Email already in use.' };

  const passwordHash = await hashPassword(password);
  const displayName = `${firstName} ${lastName}`.trim();

  const [newUser] = await db
    .insert(users)
    .values({ email, passwordHash, name: displayName, role: 'staff', active: true })
    .returning({ id: users.id });

  if (!newUser) return { error: 'Failed to create user.' };

  await db.insert(employeeProfiles).values({
    userId: newUser.id,
    firstName,
    lastName,
    photo,
    position,
    details,
    salary,
    salaryType,
    hireDate,
    notes,
  });

  await logActivity({
    actorId,
    action: 'create',
    entityType: 'employee',
    entityId: newUser.id,
    summary: { name: displayName, email },
  });

  revalidatePath('/admin/employees');
  redirect(`/admin/employees/${newUser.id}`);
}

// ── Update employee profile ────────────────────────────────────────────

const updateSchema = z.object({
  userId: z.string().uuid(),
  firstName: z.string().min(1, 'First name required').max(80),
  lastName: z.string().min(1, 'Last name required').max(80),
  position: z.string().max(100).optional(),
  details: z.string().max(1000).optional(),
  salary: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
  salaryType: z.enum(['monthly', 'daily', 'hourly']).default('monthly'),
  hireDate: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
  notes: z.string().max(500).optional(),
  photo: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
});

export async function updateEmployee(_prev: unknown, formData: FormData) {
  const actorId = await requireAdmin();

  const parsed = updateSchema.safeParse({
    userId: formData.get('userId'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    position: formData.get('position') ?? undefined,
    details: formData.get('details') ?? undefined,
    salary: formData.get('salary') ?? undefined,
    salaryType: formData.get('salaryType') ?? 'monthly',
    hireDate: formData.get('hireDate') ?? undefined,
    notes: formData.get('notes') ?? undefined,
    photo: formData.get('photo') ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const {
    userId,
    firstName,
    lastName,
    position,
    details,
    salary,
    salaryType,
    hireDate,
    notes,
    photo,
  } = parsed.data;
  const displayName = `${firstName} ${lastName}`.trim();

  await db.update(users).set({ name: displayName }).where(eq(users.id, userId));

  await db
    .insert(employeeProfiles)
    .values({
      userId,
      firstName,
      lastName,
      photo,
      position,
      details,
      salary,
      salaryType,
      hireDate,
      notes,
    })
    .onConflictDoUpdate({
      target: employeeProfiles.userId,
      set: { firstName, lastName, photo, position, details, salary, salaryType, hireDate, notes },
    });

  await logActivity({
    actorId,
    action: 'update',
    entityType: 'employee',
    entityId: userId,
    summary: { name: displayName, position },
  });

  revalidatePath('/admin/employees');
  revalidatePath(`/admin/employees/${userId}`);
  return { success: true };
}

// ── Change password ────────────────────────────────────────────────────

export async function changeEmployeePassword(_prev: unknown, formData: FormData) {
  const actorId = await requireAdmin();

  const userId = formData.get('userId') as string;
  const password = formData.get('password') as string;
  const confirm = formData.get('confirmPassword') as string;

  if (!userId) return { error: 'Missing user ID.' };
  if (!password || password.length < 8) return { error: 'Password must be at least 8 characters.' };
  if (password !== confirm) return { error: 'Passwords do not match.' };

  const passwordHash = await hashPassword(password);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

  await logActivity({
    actorId,
    action: 'password_change',
    entityType: 'employee',
    entityId: userId,
    summary: { changedBy: actorId },
  });

  return { success: true };
}

// ── Toggle active ──────────────────────────────────────────────────────

export async function toggleEmployeeActive(userId: string, active: boolean) {
  await requireAdmin();
  await db.update(users).set({ active }).where(eq(users.id, userId));
  revalidatePath('/admin/employees');
  revalidatePath(`/admin/employees/${userId}`);
}
