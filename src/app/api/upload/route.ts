import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { put } from '@vercel/blob';

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // stay under Vercel's 4.5 MB body limit

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

export async function POST(request: NextRequest) {
  // The auth proxy skips /api/* routes, so validate the cookie here
  const appPassword = process.env.APP_PASSWORD;
  if (
    appPassword &&
    request.cookies.get('auth-password')?.value !== appPassword
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const documentId = request.nextUrl.searchParams.get('documentId');
  if (!documentId) {
    return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  const ext = EXTENSIONS[contentType];
  if (!ext) {
    return NextResponse.json(
      { error: 'Unsupported image type' },
      { status: 415 }
    );
  }

  const body = await request.arrayBuffer();
  if (body.byteLength === 0) {
    return NextResponse.json({ error: 'Empty body' }, { status: 400 });
  }
  if (body.byteLength > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Image too large' }, { status: 413 });
  }

  try {
    // The Blob store is private, so blob URLs aren't directly loadable by the
    // browser. Upload privately and hand back a same-origin URL that streams
    // the image through the authenticated /api/image route.
    const pathname = `match-docs/${documentId}/${crypto.randomUUID()}.${ext}`;
    await put(pathname, body, { access: 'private', contentType });
    return NextResponse.json({
      url: `/api/image?pathname=${encodeURIComponent(pathname)}`,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
