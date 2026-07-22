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
                'border-border relative block w-full rounded-md border',
                'bg-surface-elevated text-foreground placeholder-foreground-muted px-3 py-2',
                'focus:border-primary focus:ring-primary focus:z-10',
                'focus:ring-offset-ring-offset focus:ring-2 focus:ring-offset-2 focus:outline-none',
                'transition-colors duration-150 sm:text-sm'
              )}
              placeholder="Enter app password"
              disabled={isLoading}
              autoComplete="off"
              data-1p-ignore
            />
          </div>

          {error && (
            <div className="text-status-unready text-center text-sm">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
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
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
