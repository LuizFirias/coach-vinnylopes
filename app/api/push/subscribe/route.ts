import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string }; userAgent?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
    }

    const endpoint = String(body?.endpoint || '').trim();
    const p256dh = String(body?.keys?.p256dh || '').trim();
    const authKey = String(body?.keys?.auth || '').trim();

    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json({ error: 'Inscrição inválida' }, { status: 400 });
    }

    const { adminClient, userId } = auth;
    const { error } = await adminClient.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth: authKey,
        user_agent: body.userAgent || null,
        atualizada_em: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    );

    if (error) {
      console.error('[push/subscribe] upsert', error);
      const missing = error.code === '42P01' || error.message?.includes('does not exist');
      return NextResponse.json(
        { error: missing ? 'Rode a migration 0067_push_subscriptions.sql no Supabase.' : 'Erro ao salvar inscrição' },
        { status: missing ? 503 : 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[push/subscribe]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
