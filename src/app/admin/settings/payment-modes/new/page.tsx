import Link from 'next/link';
import { redirect } from 'next/navigation';
import PaymentModeForm from '../_components/PaymentModeForm';
import { createPaymentMode } from '../actions';

export const metadata = { title: 'New Payment Mode' };

export default function NewPaymentModePage() {
  async function action(formData: FormData) {
    'use server';
    const result = await createPaymentMode(formData);
    if (result.ok) redirect('/admin/settings/payment-modes');
    return result;
  }

  return (
    <div className="px-4 py-8">
      <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
        <Link
          href="/admin/settings/payment-modes"
          className="hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Payment Modes
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100">New</span>
      </div>
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Add payment mode
      </h1>
      <PaymentModeForm action={action} submitLabel="Create" />
    </div>
  );
}
