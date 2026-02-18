import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Only protect /aluno and /admin via matcher below, but keep safety here
  if ((pathname.startsWith('/aluno') || pathname.startsWith('/admin'))) {
    const hasSession = !!req.cookies.get('sv-session');
    if (!hasSession) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/aluno/:path*', '/admin/:path*'],
};
