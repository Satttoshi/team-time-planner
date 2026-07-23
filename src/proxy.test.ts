// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

const request = (path: string, cookie?: string) => {
  const req = new NextRequest(new URL(path, 'http://localhost:3000'));
  if (cookie !== undefined) {
    req.cookies.set('auth-password', cookie);
  }
  return req;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('proxy (auth gate)', () => {
  it('lets /auth, /api and /_next requests through without a cookie', () => {
    vi.stubEnv('APP_PASSWORD', 'secret');

    for (const path of ['/auth', '/api/upload', '/_next/static/x.js']) {
      const response = proxy(request(path));
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    }
  });

  it('allows everything when no APP_PASSWORD is configured (dev mode)', () => {
    vi.stubEnv('APP_PASSWORD', '');

    const response = proxy(request('/'));
    expect(response.status).toBe(200);
  });

  it('lets a request with the correct auth cookie through', () => {
    vi.stubEnv('APP_PASSWORD', 'secret');

    const response = proxy(request('/', 'secret'));
    expect(response.status).toBe(200);
  });

  it('redirects to /auth when the cookie is missing', () => {
    vi.stubEnv('APP_PASSWORD', 'secret');

    const response = proxy(request('/'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/auth');
  });

  it('redirects to /auth when the cookie value is wrong', () => {
    vi.stubEnv('APP_PASSWORD', 'secret');

    const response = proxy(request('/match-planner', 'stale-password'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/auth');
  });
});
