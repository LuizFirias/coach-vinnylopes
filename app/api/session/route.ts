import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const access_token = body?.access_token || '';
    const refresh_token = body?.refresh_token || '';
    const expires_at = body?.expires_at || null;

    if (!access_token || !refresh_token) {
      return new NextResponse(JSON.stringify({ ok: false, error: 'Missing tokens' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Calculate max-age for access token (shorter lived)
    let accessTokenMaxAge = 60 * 60; // 1 hour default
    if (expires_at && typeof expires_at === 'number') {
      const now = Math.floor(Date.now() / 1000);
      accessTokenMaxAge = Math.max(0, Math.floor(expires_at - now));
    }

    // Refresh token lives longer (7 days)
    const refreshTokenMaxAge = 60 * 60 * 24 * 7;

    const accessTokenCookie = `sb-access-token=${access_token}; Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''} Max-Age=${accessTokenMaxAge}`;
    const refreshTokenCookie = `sb-refresh-token=${refresh_token}; Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''} Max-Age=${refreshTokenMaxAge}`;

    const response = new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    // Use append to add multiple Set-Cookie headers
    response.headers.append('Set-Cookie', accessTokenCookie);
    response.headers.append('Set-Cookie', refreshTokenCookie);

    return response;
  } catch (err) {
    return new NextResponse(JSON.stringify({ ok: false }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function DELETE() {
  const accessTokenCookie = `sb-access-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  const refreshTokenCookie = `sb-refresh-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  
  const response = new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  response.headers.append('Set-Cookie', accessTokenCookie);
  response.headers.append('Set-Cookie', refreshTokenCookie);

  return response;
}
