import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser';
import { sendPushToUser } from '@/lib/push/sendPush';

const DEDUPE_MINUTES = 90;

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let body: { nomeRotina?: string };
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const nomeRotina = String(body?.nomeRotina || '').trim();

    const { adminClient, userId: alunoId } = auth;

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('full_name, coach_id')
      .eq('id', alunoId)
      .maybeSingle();

    if (profileError) {
      console.error('[notifications/workout-started] profile', profileError);
      return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 });
    }
    const coachId = profile?.coach_id as string | null;
    if (!coachId) {
      // Aluno sem coach vinculado — nada a notificar, não é um erro
      return NextResponse.json({ ok: true, skipped: true });
    }

    const alunoNome = (profile?.full_name as string | null)?.split(' ').slice(0, 2).join(' ') || 'Seu aluno';

    const since = new Date(Date.now() - DEDUPE_MINUTES * 60 * 1000).toISOString();
    const { data: existing } = await adminClient
      .from('notificacoes')
      .select('id')
      .eq('destinatario_id', coachId)
      .eq('remetente_id', alunoId)
      .eq('tipo', 'treino_iniciado')
      .gte('criada_em', since)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json({ ok: true, notificationId: existing.id, deduped: true });
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('notificacoes')
      .insert({
        destinatario_id: coachId,
        remetente_id: alunoId,
        tipo: 'treino_iniciado',
        titulo: `${alunoNome} iniciou um treino`,
        corpo: nomeRotina ? `Treino: ${nomeRotina}` : 'Acompanhe o treino em andamento.',
        link: `/admin/aluno/${alunoId}`,
        metadata: { alunoId, nomeRotina: nomeRotina || null },
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[notifications/workout-started] insert', insertError);
      return NextResponse.json({ error: insertError.message || 'Erro ao criar notificação' }, { status: 500 });
    }

    // Best-effort (nunca lança) — mas precisa ser aguardado, senão a função
    // serverless pode encerrar antes do envio terminar.
    await sendPushToUser(adminClient, coachId, {
      title: `${alunoNome} iniciou um treino`,
      body: nomeRotina ? `Treino: ${nomeRotina}` : 'Acompanhe o treino em andamento.',
      url: `/admin/aluno/${alunoId}`,
      tag: 'treino_iniciado',
    });

    return NextResponse.json({ ok: true, notificationId: inserted.id, deduped: false });
  } catch (err) {
    console.error('[notifications/workout-started]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
