'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from '@/lib/auth-actions';
import { clsx } from 'clsx';

const initialState: LoginState = { error: '' };

export default function AuthPage() {
  // Server-action form: works via native POST even before/without JS
  // hydration (progressive enhancement), so iOS autofill quirks and
  // hydration failures can't block the login
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="text-foreground mt-6 text-center text-3xl font-extrabold">
            Authentication Required
          </h2>
          <p className="text-foreground-secondary mt-2 text-center text-sm">
            Please enter the app password to access the team planner
          </p>
        </div>

        <form className="mt-8 space-y-4 px-4" action={formAction}>
          <div>
            <label htmlFor="app-password" className="sr-only">
              App Password
            </label>
            <input
              id="app-password"
              name="app-password"
              type="password"
              required
              className={clsx(
                'border-border relative block w-full rounded-md border',
                'bg-surface-elevated text-foreground placeholder-foreground-muted px-3 py-2',
                'focus:border-primary focus:ring-primary focus:z-10',
                'focus:ring-offset-ring-offset focus:ring-2 focus:ring-offset-2 focus:outline-none',
                'transition-colors duration-150 sm:text-sm'
              )}
              placeholder="Enter app password"
              disabled={isPending}
              autoComplete="off"
              data-1p-ignore
            />
          </div>

          {state.error && (
            <div className="text-status-unready text-center text-sm">
              {state.error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isPending}
              className={clsx(
                'group relative flex w-full justify-center rounded-md',
                'bg-primary border border-transparent px-4 py-2',
                'hover:bg-primary-hover text-sm font-medium text-white',
                'focus:ring-ring focus:ring-2 focus:outline-none',
                'focus:ring-offset-ring-offset focus:ring-offset-2',
                'disabled:hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50',
                'transition-colors duration-150'
              )}
            >
              {isPending ? 'Authenticating...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
