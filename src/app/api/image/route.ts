import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { get } from '@vercel/blob';

export async function GET(request: NextRequest) {
  // The auth proxy skips /api/* routes, so validate the cookie here
  const appPassword = process.env.APP_PASSWORD;
  if (
    appPassword &&
    request.cookies.get('auth-password')?.value !== appPassword
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pathname = request.nextUrl.searchParams.get('pathname');
  if (!pathname || !pathname.startsWith('match-docs/')) {
    return NextResponse.json({ error: 'Invalid pathname' }, { status: 400 });
  }

  try {
    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    });

    if (!result) {
      return new NextResponse('Not found', { status: 404 });
    }

    // Blob unchanged — tell the browser to use its cached copy
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          'Cache-Control': 'private, no-cache',
        },
      });
    }

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        'X-Content-Type-Options': 'nosniff',
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json({ error: 'Failed to load image' }, { status: 500 });
  }
}
