'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { ChatList } from '@/app/components/chat/ChatList';
import { getSafeSession } from '@/lib/authErrorHandler';
import { getBootstrapProfile } from '@/lib/auth/bootstrapProfile';
import {
  getChatListCoach,
  getOuCriarConversa,
  type ChatListItem,
} from '@/lib/chat/queries';

export default function ChatCoachPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [conversas, setConversas] = useState<ChatListItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const session = await getSafeSession();
      if (!session?.user) {
        router.replace('/login');
        return;
      }
      const profile = await getBootstrapProfile();
      if (profile?.role === 'aluno') {
        router.replace('/aluno/chat');
        return;
      }
      const list = await getChatListCoach(session.user.id);
      setConversas(list);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Erro ao carregar conversas';
      console.error('[ChatCoach]', message, err);
      setErro(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSelect = async (item: ChatListItem) => {
    if (abrindo) return;
    if (!item.pendingCreate) {
      router.push(`/admin/chat/${item.id}`);
      return;
    }
    setAbrindo(true);
    try {
      const session = await getSafeSession();
      if (!session?.user) return;
      const id = await getOuCriarConversa(item.alunoId, session.user.id);
      router.push(`/admin/chat/${id}`);
    } catch (err) {
      console.error('[ChatCoach] abrir', err);
      setErro(err instanceof Error ? err.message : 'Não foi possível abrir o chat');
    } finally {
      setAbrindo(false);
    }
  };

  return (
    <div
      className="min-h-screen pb-24 lg:pb-8"
      style={{ background: 'var(--mobile-page-bg-solid, #ffffff)' }}
    >
      <div
        className="px-4 py-5"
        style={{ borderBottom: '1px solid var(--mobile-card-border, rgba(0,0,0,0.07))' }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary, #1a1a1a)' }}>
          Conversas
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary, #888)', marginTop: 4 }}>
          Chat com seus alunos
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <DumbbellLoader />
        </div>
      ) : erro ? (
        <p className="px-4 py-8 text-center text-sm" style={{ color: '#e05555' }}>
          {erro}
        </p>
      ) : (
        <ChatList conversas={conversas} onSelect={(item) => void handleSelect(item)} />
      )}

      {abrindo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <DumbbellLoader />
        </div>
      )}
    </div>
  );
}
