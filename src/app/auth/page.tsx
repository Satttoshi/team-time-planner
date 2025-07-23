'use client'

import { useState } from 'react'
import { authenticateUser } from '@/lib/auth-actions'

export default function AuthPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await authenticateUser(password)
      if (!result.success) {
        setError(result.error || 'Authentication failed')
        setIsLoading(false)
      } else {
        // Success - use a small delay to ensure cookie is set, then redirect
        setTimeout(() => {
          window.location.replace('/')
        }, 100)
      }
    } catch (error) {
      console.error('Auth error:', error)
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-100">
            Authentication Required
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Please enter the app password to access the team planner
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
              onChange={(e) => setPassword(e.target.value)}
              className="relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-gray-100 bg-gray-800 rounded-md focus:outline-none focus:ring-blue-400 focus:border-blue-400 focus:z-10 sm:text-sm"
              placeholder="Enter app password"
              disabled={isLoading}
              autoComplete="off"
              data-1p-ignore
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-blue-400 disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}