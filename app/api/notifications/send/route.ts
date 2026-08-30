import { NextResponse } from 'next/server';
import { getAuthenticatedCoach } from '@/lib/auth/getAuthenticatedCoach';
import {
  COACH_NOTIFICATION_TEMPLATES,
  type CoachNotificationTipo,
} from '@/lib/notifications/templates';

const DEDUPE_HOURS = 24;
const ALLOWED = new Set<CoachNotificationTipo>([
  'checkin_reminder',
  'photos_reminder',
]);

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedCoach(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let body: { alunoId?: string; tipo?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
    }

    const alunoId = String(body?.alunoId || '').trim();
    const tipo = String(body?.tipo || '').trim() as CoachNotificationTipo;

    if (!alunoId) {
      return NextResponse.json({ error: 'alunoId é obrigatório' }, { status: 400 });
    }
    if (!ALLOWED.has(tipo)) {
      return NextResponse.json({ error: 'tipo inválido' }, { status: 400 });
    }

    const template = COACH_NOTIFICATION_TEMPLATES[tipo];
    const { adminClient, userId: coachId } = auth;

    const { data: link, error: linkError } = await adminClient
      .from('coach_alunos')
      .select('aluno_id')
      .eq('coach_id', coachId)
      .eq('aluno_id', alunoId)
      .maybeSingle();

    if (linkError) {
      console.error('[notifications/send] coach_alunos', linkError);
      return NextResponse.json({ error: 'Erro ao validar aluno' }, { status: 500 });
    }
    if (!link) {
      return NextResponse.json({ error: 'Aluno não vinculado a este coach' }, { status: 403 });
    }

    const since = new Date(Date.now() - DEDUPE_HOURS * 60 * 60 * 1000).toISOString();
    const { data: existing } = await adminClient
      .from('notificacoes')
      .select('id')
      .eq('destinatario_id', alunoId)
      .eq('remetente_id', coachId)
      .eq('tipo', tipo)
      .is('lida_em', null)
      .gte('criada_em', since)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json({
        ok: true,
        notificationId: existing.id,
        deduped: true,
      });
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('notificacoes')
      .insert({
        destinatario_id: alunoId,
        remetente_id: coachId,
        tipo,
        titulo: template.titulo,
        corpo: template.corpo,
        link: template.link,
        metadata: { source: template.source },
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[notifications/send] insert', insertError);
      const missing =
        insertError.code === '42P01' ||
        insertError.message?.includes('does not exist') ||
        insertError.message?.includes('Could not find the table') ||
        insertError.message?.includes('notificacoes_tipo_check');
      return NextResponse.json(
        {
          error: missing
            ? 'Atualize as migrations de notificações no Supabase (0060 e 0061).'
            : insertError.message || 'Erro ao criar notificação',
        },
        { status: missing ? 503 : 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      notificationId: inserted.id,
      deduped: false,
    });
  } catch (err) {
    console.error('[notifications/send]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
