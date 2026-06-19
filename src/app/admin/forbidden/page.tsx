export const metadata = { title: 'Access Denied' };

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-bold text-zinc-200 dark:text-zinc-700">403</p>
      <h1 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Access denied</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        You don't have permission to view this section. Contact your admin to request access.
      </p>
    </div>
  );
}
