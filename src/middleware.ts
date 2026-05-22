import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const path = request.nextUrl.pathname;
  const isApiRoute = path.startsWith('/api/');

  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifyJwt(token);

  if (!payload) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Admin route protection
  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
    if (payload.role !== 'ADMIN') {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Redirect members trying to access admin back to portal
      return NextResponse.redirect(new URL('/portal', request.url));
    }
  }

  // Portal route protection (both ADMIN and MEMBER can access)
  // No specific role check needed, just being authenticated is enough for now.

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/portal/:path*',
    '/api/portal/:path*'
  ]
};
