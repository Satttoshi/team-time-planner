'use client';

import { useState } from 'react';
import { authenticateUser } from '@/lib/auth-actions';
import { clsx } from 'clsx';

export default function AuthPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await authenticateUser(password);
      if (!result.success) {
        setError(result.error || 'Authentication failed');
        setIsLoading(false);
      } else {
        // Success - use a small delay to ensure cookie is set, then redirect
        setTimeout(() => {
          window.location.replace('/');
        }, 100);
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Authentication Required
          </h2>
          <p className="mt-2 text-center text-sm text-foreground-secondary">
            Please enter the app password to access the team planner
          </p>
        </div>

        <form className="mt-8 space-y-4 px-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="app-password" className="sr-only">
              App Password
            </label>
            <input
              id="app-password"
              name="app-password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={clsx(
                'relative block w-full rounded-md border border-border',
                'bg-surface-elevated px-3 py-2 text-foreground placeholder-foreground-muted',
                'focus:z-10 focus:border-primary focus:ring-primary',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-ring-offset',
                'transition-colors duration-150 sm:text-sm'
              )}
              placeholder="Enter app password"
              disabled={isLoading}
              autoComplete="off"
              data-1p-ignore
            />
          </div>

          {error && (
            <div className="text-center text-sm text-status-unready">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className={clsx(
                'group relative flex w-full justify-center rounded-md',
                'border border-transparent bg-primary px-4 py-2',
                'text-sm font-medium text-white hover:bg-primary-hover',
                'focus:ring-2 focus:ring-ring focus:outline-none',
                'focus:ring-offset-2 focus:ring-offset-ring-offset',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary',
                'transition-colors duration-150'
              )}
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
