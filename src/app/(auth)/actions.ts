'use server';

import { randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { z } from 'zod';
import { signIn } from '@/auth';
import { db } from '@/db';
import { passwordResetTokens, users } from '@/db/schema';
import { env } from '@/env';
import { logActivity } from '@/lib/activity-log';
import { sendPasswordResetEmail } from '@/lib/email';
import { hashPassword } from '@/lib/password';

// ── Sign-in ────────────────────────────────────────────────────────────

export type SignInState = { error?: string } | null;

export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  try {
    await signIn('credentials', {
      login: formData.get('login'),
      password: formData.get('password'),
      redirectTo: '/admin',
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: 'Invalid email, username, or password.' };
    }
    // signIn throws a redirect — let it propagate.
    throw e;
  }
  return null;
}

// ── Forgot password ────────────────────────────────────────────────────

const emailSchema = z.object({ email: z.string().email() });
export type ForgotState = { error?: string; success?: boolean } | null;

export async function requestPasswordResetAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const parsed = emailSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: 'Enter a valid email address.' };

  const { email } = parsed.data;

  const [user] = await db
    .select({ id: users.id, active: users.active })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  // Always return success — don't leak whether the email exists.
  if (!user?.active) return { success: true };

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });

  const baseUrl = env.AUTH_URL ?? 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await sendPasswordResetEmail({ to: email, resetUrl });

  return { success: true };
}

// ── Reset password ─────────────────────────────────────────────────────

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  confirm: z.string(),
});

export type ResetState = { error?: string; success?: boolean } | null;

export async function resetPasswordAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = resetSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input.';
    return { error: msg };
  }

  const { token, password, confirm } = parsed.data;

  if (password !== confirm) return { error: 'Passwords do not match.' };

  const now = new Date();
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expiresAt, now),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);

  if (!row) return { error: 'This link is invalid or has expired. Request a new one.' };

  const newHash = await hashPassword(password);

  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash: newHash }).where(eq(users.id, row.userId));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(eq(passwordResetTokens.id, row.id));
  });

  await logActivity({
    actorId: row.userId,
    action: 'password_reset',
    entityType: 'user',
    entityId: row.userId,
  });

  redirect('/login?reset=1');
}
