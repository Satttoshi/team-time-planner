import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const cookieSet = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ set: cookieSet })),
}));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

import { loginAction, type LoginState } from './auth-actions';

const prevState: LoginState = { error: '' };

const formDataWith = (password?: string) => {
  const formData = new FormData();
  if (password !== undefined) formData.set('app-password', password);
  return formData;
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('loginAction', () => {
  it('fails when APP_PASSWORD is not configured', async () => {
    vi.stubEnv('APP_PASSWORD', '');

    await expect(loginAction(prevState, formDataWith('anything'))).resolves.toEqual({
      error: 'Authentication not configured',
    });
    expect(cookieSet).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('rejects a missing password', async () => {
    vi.stubEnv('APP_PASSWORD', 'secret');

    await expect(loginAction(prevState, formDataWith())).resolves.toEqual({
      error: 'Please enter the app password',
    });
  });

  it('rejects a whitespace-only password', async () => {
    vi.stubEnv('APP_PASSWORD', 'secret');

    await expect(loginAction(prevState, formDataWith('   '))).resolves.toEqual({
      error: 'Please enter the app password',
    });
  });

  it('rejects a wrong password without setting a cookie', async () => {
    vi.stubEnv('APP_PASSWORD', 'secret');

    await expect(loginAction(prevState, formDataWith('nope'))).resolves.toEqual({
      error: 'Invalid password',
    });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it('sets a persistent auth cookie and redirects home on success', async () => {
    vi.stubEnv('APP_PASSWORD', 'secret');

    await loginAction(prevState, formDataWith('secret'));

    expect(cookieSet).toHaveBeenCalledWith(
      'auth-password',
      'secret',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
      })
    );
    expect(redirectMock).toHaveBeenCalledWith('/');
  });
});
