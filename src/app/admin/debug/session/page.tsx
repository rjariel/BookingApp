import { auth } from '@/auth';

export const metadata = { title: 'Session Debug — BookingApp' };

export default async function SessionDebugPage() {
  const session = await auth();

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold">Session Debug Info</h1>

      <div className="max-w-2xl rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <pre className="overflow-auto text-xs">{JSON.stringify(session, null, 2)}</pre>
      </div>

      <div className="mt-6 space-y-3 text-sm">
        <div>
          <span className="font-medium">Authenticated:</span>{' '}
          <span className={session?.user ? 'text-green-600' : 'text-red-600'}>
            {session?.user ? 'Yes' : 'No'}
          </span>
        </div>
        <div>
          <span className="font-medium">Email:</span> <span>{session?.user?.email ?? 'N/A'}</span>
        </div>
        <div>
          <span className="font-medium">Role:</span>{' '}
          <span className={session?.user?.role === 'admin' ? 'text-green-600 font-bold' : ''}>
            {session?.user?.role ?? 'N/A'}
          </span>
        </div>
        <div>
          <span className="font-medium">Role === 'admin':</span>{' '}
          <span className={session?.user?.role === 'admin' ? 'text-green-600' : 'text-red-600'}>
            {String(session?.user?.role === 'admin')}
          </span>
        </div>
      </div>
    </div>
  );
}
