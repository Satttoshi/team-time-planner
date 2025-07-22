import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Skip middleware for auth page, API routes, and assets
  if (pathname.startsWith('/auth') || 
      pathname.startsWith('/api') ||
      pathname.startsWith('/_next')) {
    return NextResponse.next()
  }
  
  const authCookie = request.cookies.get('auth-password')
  const appPassword = process.env.APP_PASSWORD
  
  // If no app password is configured, allow access (dev mode)
  if (!appPassword) {
    return NextResponse.next()
  }
  
  // Check if auth cookie matches app password
  if (authCookie?.value === appPassword) {
    return NextResponse.next()
  }
  
  // Redirect to auth page
  return NextResponse.redirect(new URL('/auth', request.url))
}

export const config = {
  matcher: [
    // Match all paths except static files and auth
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}