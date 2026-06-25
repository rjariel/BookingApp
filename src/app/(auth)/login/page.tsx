import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">BookingApp admin &amp; staff</p>
      </header>
      <LoginForm />
    </div>
  );
}
