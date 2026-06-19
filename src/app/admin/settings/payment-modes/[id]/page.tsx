import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { paymentModes } from '@/db/schema';
import { requireModule } from '@/lib/permissions';
import PaymentModeForm from '../_components/PaymentModeForm';
import { updatePaymentMode } from '../actions';

export const metadata = { title: 'Edit Payment Mode' };

export default async function EditPaymentModePage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule('payment_modes');
  const { id } = await params;

  const [mode] = await db.select().from(paymentModes).where(eq(paymentModes.id, id)).limit(1);

  if (!mode) notFound();

  async function action(formData: FormData) {
    'use server';
    const result = await updatePaymentMode(id, formData);
    if (result.ok) redirect('/admin/settings/payment-modes');
    return result;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
        <Link
          href="/admin/settings/payment-modes"
          className="hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Payment Modes
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100">{mode.name}</span>
      </div>
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Edit payment mode
      </h1>
      <PaymentModeForm action={action} defaultName={mode.name} submitLabel="Save changes" />
    </div>
  );
}
