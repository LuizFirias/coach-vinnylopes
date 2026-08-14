'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { ChatWindow } from '@/app/components/chat/ChatWindow';
import { getSafeSession } from '@/lib/authErrorHandler';
import { getConversaMeta, unwrapPerfil } from '@/lib/chat/queries';

export default function ChatAlunoConversaPage() {
  const params = useParams();
  const router = useRouter();
  const conversaId = String(params.conversaId ?? '');

  const [meuId, setMeuId] = useState<string | null>(null);
  const [nomeOutro, setNomeOutro] = useState('Coach');
  const [avatarOutro, setAvatarOutro] = useState<string | null>(null);
  const [sexoOutro, setSexoOutro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!conversaId) return;
    let cancelled = false;
    void (async () => {
      try {
        const session = await getSafeSession();
        if (!session?.user) {
          router.replace('/login');
          return;
        }
        const meta = await getConversaMeta(conversaId);
        if (!meta) {
          if (!cancelled) setErro('Conversa não encontrada.');
          return;
        }
        if (meta.aluno_id !== session.user.id && meta.coach_id !== session.user.id) {
          if (!cancelled) setErro('Sem permissão para esta conversa.');
          return;
        }
        const coach = unwrapPerfil(meta.coach);
        if (!cancelled) {
          setMeuId(session.user.id);
          setNomeOutro(coach?.full_name ?? 'Coach');
          setAvatarOutro(coach?.avatar_url ?? null);
          setSexoOutro(coach?.sexo ?? null);
        }
      } catch (err) {
        console.error('[ChatAlunoConversa]', err);
        if (!cancelled) setErro('Erro ao carregar conversa.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversaId, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <DumbbellLoader />
      </div>
    );
  }

  if (erro || !meuId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6">
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{erro ?? 'Erro'}</p>
        <button
          type="button"
          onClick={() => router.push('/aluno/dashboard')}
          className="rounded-[10px] px-4 py-2 text-sm font-semibold text-white"
          style={{ background: 'var(--brand-primary)' }}
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <ChatWindow
      conversaId={conversaId}
      meuId={meuId}
      nomeOutro={nomeOutro}
      avatarOutro={avatarOutro}
      sexoOutro={sexoOutro}
      backHref="/aluno/dashboard"
    />
  );
}
