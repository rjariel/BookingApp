import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { expenses, expenseTypes, inventoryItems, paymentModes, users } from '@/db/schema';
import { requireModule } from '@/lib/permissions';
import { fmtPhDateTime } from '@/lib/timezone';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Expense ${id.slice(0, 8)}` };
}

const fmtMoney = (v: string) =>
  `₱${parseFloat(v).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule('expenses');

  const { id } = await params;

  const [row] = await db
    .select({
      id: expenses.id,
      amount: expenses.amount,
      spentOn: expenses.spentOn,
      description: expenses.description,
      qty: expenses.qty,
      createdAt: expenses.createdAt,
      typeName: expenseTypes.name,
      isInventoryPurchase: expenseTypes.isInventoryPurchase,
      modeName: paymentModes.name,
      itemName: inventoryItems.name,
      recordedByName: users.name,
    })
    .from(expenses)
    .leftJoin(expenseTypes, eq(expenses.expenseTypeId, expenseTypes.id))
    .leftJoin(paymentModes, eq(expenses.paymentModeId, paymentModes.id))
    .leftJoin(inventoryItems, eq(expenses.inventoryItemId, inventoryItems.id))
    .leftJoin(users, eq(expenses.recordedBy, users.id))
    .where(eq(expenses.id, id))
    .limit(1);

  if (!row) notFound();

  const fmt = fmtPhDateTime;

  return (
    <div className="px-4 py-8">
      <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/admin/expenses" className="hover:text-zinc-700 dark:hover:text-zinc-300">
          Expenses
        </Link>
        <span>/</span>
        <span className="font-mono text-zinc-900 dark:text-zinc-100">{id.slice(0, 8)}</span>
      </div>

      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Expense detail
      </h1>

      <div className="divide-y divide-zinc-100 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-700">
        <Row label="Type" value={row.typeName ?? '—'} />
        <Row label="Amount" value={fmtMoney(row.amount)} />
        <Row label="Date" value={row.spentOn} />
        <Row label="Payment method" value={row.modeName ?? '—'} />
        <Row label="Description" value={row.description ?? '—'} />
        {row.isInventoryPurchase && (
          <>
            <Row label="Inventory item" value={row.itemName ?? '—'} />
            <Row label="Qty restocked" value={String(row.qty ?? '—')} />
          </>
        )}
        <Row label="Recorded by" value={row.recordedByName ?? '—'} />
        <Row label="Recorded at" value={fmt.format(row.createdAt)} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between px-4 py-3">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 text-right max-w-[60%]">
        {value}
      </span>
    </div>
  );
}
