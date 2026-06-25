import LoginForm from '@/components/LoginForm';
import { getStudioProfile } from '@/lib/store-settings';

export default async function Home() {
  const studio = await getStudioProfile();

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-8">
          {/* Branding */}
          <header className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              {studio.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={studio.logoUrl}
                  alt={studio.studioName}
                  className="h-8 w-8 rounded-lg object-contain"
                />
              )}
              <h1 className="text-2xl font-semibold tracking-tight">{studio.studioName}</h1>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Admin &amp; staff portal</p>
          </header>

          {/* Login form */}
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
