import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let body: { endpoint?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
    }

    const endpoint = String(body?.endpoint || '').trim();
    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint é obrigatório' }, { status: 400 });
    }

    const { adminClient, userId } = auth;
    const { error } = await adminClient
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('[push/unsubscribe] delete', error);
      return NextResponse.json({ error: 'Erro ao remover inscrição' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[push/unsubscribe]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
