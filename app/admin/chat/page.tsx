'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from '@phosphor-icons/react';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { ChatList } from '@/app/components/chat/ChatList';
import { NovoChatSheet } from '@/app/components/chat/NovoChatSheet';
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
  const [novoChatOpen, setNovoChatOpen] = useState(false);

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

  /** Lista principal: só conversas já iniciadas (padrão WhatsApp). */
  const conversasAtivas = useMemo(
    () => conversas.filter((c) => !c.pendingCreate),
    [conversas],
  );

  const handleSelect = async (item: ChatListItem) => {
    if (abrindo) return;
    setNovoChatOpen(false);
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
      style={{ background: 'var(--surface-0)' }}
    >
      <div
        className="px-4 py-5 flex items-start justify-between gap-3"
        style={{ borderBottom: '1px solid var(--mobile-card-border, rgba(0,0,0,0.07))' }}
      >
        <div className="min-w-0">
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary, #1a1a1a)' }}>
            Conversas
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary, #888)', marginTop: 4 }}>
            Chat com seus alunos
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNovoChatOpen(true)}
          aria-label="Novo chat"
          title="Novo chat"
          className="mt-0.5 p-1.5 rounded-lg shrink-0"
          style={{ color: 'var(--text-primary, #1a1a1a)' }}
        >
          <Plus size={22} weight="bold" />
        </button>
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
        <ChatList
          conversas={conversasAtivas}
          onSelect={(item) => void handleSelect(item)}
          emptyLabel="Nenhuma conversa ainda. Toque em + para iniciar."
        />
      )}

      {novoChatOpen && (
        <NovoChatSheet
          alunos={conversas}
          onClose={() => setNovoChatOpen(false)}
          onSelect={(item) => void handleSelect(item)}
        />
      )}

      {abrindo && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/30">
          <DumbbellLoader />
        </div>
      )}
    </div>
  );
}
