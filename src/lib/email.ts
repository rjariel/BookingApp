import 'server-only';
import { env } from '@/env';

interface ResetEmailPayload {
  to: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({ to, resetUrl }: ResetEmailPayload) {
  // Dev fallback: log the link so the flow works without a Resend key.
  if (!env.RESEND_API_KEY) {
    console.log(`[email] Password reset link for ${to}: ${resetUrl}`);
    return;
  }

  const { Resend } = await import('resend');
  const resend = new Resend(env.RESEND_API_KEY);

  await resend.emails.send({
    from: 'BookingApp <noreply@yourdomain.com>',
    to,
    subject: 'Reset your password',
    html: `
      <p>Click the link below to reset your password. It expires in 1 hour.</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });
}
