import { auth } from '@/auth';

export const metadata = { title: 'Auth Test — BookingApp' };

export default async function AuthTestPage() {
  const session = await auth();

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold">Auth Test</h1>

      <div className="max-w-2xl space-y-4">
        <div>
          <h2 className="font-medium">Session object exists:</h2>
          <p>{String(!!session)}</p>
        </div>

        <div>
          <h2 className="font-medium">Session.user exists:</h2>
          <p>{String(!!session?.user)}</p>
        </div>

        <div>
          <h2 className="font-medium">Session.user.id exists:</h2>
          <p>{String(!!session?.user?.id)}</p>
        </div>

        <div>
          <h2 className="font-medium">Session.user.role:</h2>
          <p>{session?.user?.role ?? 'undefined'}</p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="font-medium mb-2">Full session:</h2>
          <pre className="overflow-auto text-xs">{JSON.stringify(session, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
