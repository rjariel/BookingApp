import { requireModule } from '@/lib/permissions';
import { ReportsClient } from './_components/ReportsClient';

export const metadata = { title: 'Reports' };

export default async function ReportsPage() {
  await requireModule('cashflow');

  return <ReportsClient />;
}
