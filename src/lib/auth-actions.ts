'use server';

import { cookies } from 'next/headers';

export async function authenticateUser(password: string) {
  const appPassword = process.env.APP_PASSWORD;

  if (!appPassword) {
    return { success: false, error: 'Authentication not configured' };
  }

  if (password !== appPassword) {
    return { success: false, error: 'Invalid password' };
  }

  // Set cookie with long expiration for persistence
  const cookieStore = await cookies();
  cookieStore.set('auth-password', password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 365 * 24 * 60 * 60, // 1 year in seconds for persistent auth
  });

  return { success: true };
}
