import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // /styleguide é uma referência interna de design — só deve existir em dev local
  if (pathname.startsWith('/styleguide') && process.env.NODE_ENV === 'production') {
    return NextResponse.rewrite(new URL('/__not-found', req.url));
  }

  // Check for authentication on protected routes
  if ((pathname.startsWith('/aluno') || pathname.startsWith('/admin') || pathname.startsWith('/super-admin'))) {
    // The actual auth check happens client-side through Supabase SDK
    // Middleware just ensures cookies are passed through
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/aluno/:path*', '/admin/:path*', '/super-admin/:path*', '/styleguide/:path*', '/styleguide'],
};
