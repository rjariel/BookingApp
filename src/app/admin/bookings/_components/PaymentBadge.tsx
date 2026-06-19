type PaymentStatus = 'unpaid' | 'partial' | 'paid';

const config: Record<PaymentStatus, { label: string; cls: string }> = {
  paid: {
    label: 'Paid',
    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  },
  partial: {
    label: 'Partial',
    cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  },
  unpaid: {
    label: 'Unpaid',
    cls: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  },
};

export default function PaymentBadge({ status }: { status: PaymentStatus }) {
  const { label, cls } = config[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}
