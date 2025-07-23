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
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-100">
            Authentication Required
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
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
                'relative block w-full rounded-md border border-gray-600',
                'bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-400',
                'focus:z-10 focus:border-blue-400 focus:ring-blue-400',
                'focus:outline-none sm:text-sm'
              )}
              placeholder="Enter app password"
              disabled={isLoading}
              autoComplete="off"
              data-1p-ignore
            />
          </div>

          {error && (
            <div className="text-center text-sm text-red-400">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className={clsx(
                'group relative flex w-full justify-center rounded-md',
                'border border-transparent bg-blue-600 px-4 py-2',
                'text-sm font-medium text-white hover:bg-blue-700',
                'focus:ring-2 focus:ring-blue-400 focus:outline-none',
                'focus:ring-offset-2 focus:ring-offset-gray-950',
                'disabled:cursor-not-allowed disabled:bg-gray-700'
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
