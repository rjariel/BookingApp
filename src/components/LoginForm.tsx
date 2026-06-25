'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useActionState } from 'react';
import { type SignInState, signInAction } from '@/app/(auth)/actions';

function LoginFormInner() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAction, null);
  const params = useSearchParams();
  const wasReset = params.get('reset') === '1';

  return (
    <div className="flex flex-col gap-6">
      {wasReset && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
          Password updated. Sign in with your new password.
        </p>
      )}

      {state?.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
        >
          {state.error}
        </p>
      )}

      <form action={action} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login" className="text-sm font-medium">
            Email or username
          </label>
          <input
            id="login"
            name="login"
            type="text"
            autoComplete="username"
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-white/10 dark:bg-white/5 dark:focus:ring-white/30"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-white/10 dark:bg-white/5 dark:focus:ring-white/30"
          />
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-60 dark:bg-white dark:text-zinc-900"
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
          <Link
            href="/forgot-password"
            className="text-center text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Forgot password?
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function LoginForm() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}
