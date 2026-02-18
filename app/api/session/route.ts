import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const access_token = body?.access_token || '';
    const expires_at = body?.expires_at || null;

    // Calculate max-age (seconds)
    let maxAge = 60 * 60 * 24 * 7; // default 7 days
    if (expires_at && typeof expires_at === 'number') {
      const now = Math.floor(Date.now() / 1000);
      maxAge = Math.max(0, Math.floor(expires_at - now));
    }

    const cookie = `sv-session=${access_token}; Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''} Max-Age=${maxAge}`;

    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
    });
  } catch (err) {
    return new NextResponse(JSON.stringify({ ok: false }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function DELETE() {
  const cookie = `sv-session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
  });
}
