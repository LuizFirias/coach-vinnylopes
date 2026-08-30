'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { getSafeSession } from '@/lib/authErrorHandler';
import { getBootstrapProfile } from '@/lib/auth/bootstrapProfile';
import { getOuCriarConversa } from '@/lib/chat/queries';
import { supabaseClient } from '@/lib/supabaseClient';

/**
 * Aluno tem 1 conversa (com o coach) — resolve e redireciona.
 */
export default function ChatAlunoRedirectPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await getSafeSession();
        if (!session?.user) {
          router.replace('/login');
          return;
        }

        const profile = await getBootstrapProfile();
        let coachId = profile?.coach_id ?? null;

        if (!coachId) {
          const { data: rel } = await supabaseClient
            .from('coach_alunos')
            .select('coach_id')
            .eq('aluno_id', session.user.id)
            .maybeSingle();
          coachId = rel?.coach_id ?? null;
        }

        if (!coachId) {
          if (!cancelled) setErro('Você ainda não tem um coach vinculado.');
          return;
        }

        const conversaId = await getOuCriarConversa(session.user.id, coachId);
        if (!cancelled) router.replace(`/aluno/chat/${conversaId}`);
      } catch (err) {
        console.error('[ChatAlunoRedirect]', err);
        if (!cancelled) {
          setErro(err instanceof Error ? err.message : 'Não foi possível abrir o chat.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (erro) {
    return (
      <div
        className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6"
        style={{ background: 'var(--surface-0)' }}
      >
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>{erro}</p>
        <button
          type="button"
          onClick={() => router.push('/aluno/dashboard')}
          className="rounded-[10px] px-4 py-2 text-sm font-semibold text-white"
          style={{ background: '#D4A843' }}
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      style={{ background: 'var(--surface-0)' }}
    >
      <DumbbellLoader />
    </div>
  );
}
