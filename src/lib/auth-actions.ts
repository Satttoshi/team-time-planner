'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type LoginState = {
  error: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const appPassword = process.env.APP_PASSWORD;

  if (!appPassword) {
    return { error: 'Authentication not configured' };
  }

  const password = formData.get('app-password');

  if (typeof password !== 'string' || !password.trim()) {
    return { error: 'Please enter the app password' };
  }

  if (password !== appPassword) {
    return { error: 'Invalid password' };
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

  redirect('/');
}
