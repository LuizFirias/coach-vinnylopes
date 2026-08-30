'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChatsCircle, Plus, DotsThreeVertical, PaperPlaneTilt, MagnifyingGlass } from '@phosphor-icons/react';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { ChatList } from '@/app/components/chat/ChatList';
import { NovoChatSheet } from '@/app/components/chat/NovoChatSheet';
import { EnviarMensagemModal } from '@/app/components/chat/EnviarMensagemModal';
import { InlineChatPanel } from '@/app/components/chat/InlineChatPanel';
import { cn } from '@/lib/utils/cn';
import { getSafeSession } from '@/lib/authErrorHandler';
import { getBootstrapProfile } from '@/lib/auth/bootstrapProfile';
import {
  getChatListCoach,
  getOuCriarConversa,
  type ChatListItem,
} from '@/lib/chat/queries';

type Tab = 'todas' | 'nao-lidas';

export default function ChatCoachPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [meuId, setMeuId] = useState<string | null>(null);
  const [conversas, setConversas] = useState<ChatListItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const [novoChatOpen, setNovoChatOpen] = useState(false);
  const [enviarMensagemOpen, setEnviarMensagemOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('todas');
  const [busca, setBusca] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  // Desktop: conversa aberta no painel da direita (2 colunas, estilo WhatsApp)
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      setMeuId(session.user.id);
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

  const conversasFiltradas = useMemo(() => {
    let list = conversasAtivas;
    if (tab === 'nao-lidas') list = list.filter((c) => c.nao_lidas > 0);
    const termo = busca.trim().toLowerCase();
    if (termo) list = list.filter((c) => (c.outro.full_name ?? '').toLowerCase().includes(termo));
    return list;
  }, [conversasAtivas, tab, busca]);

  const selecionada = useMemo(
    () => conversasAtivas.find((c) => c.id === selectedId) ?? null,
    [conversasAtivas, selectedId],
  );

  /** Mobile: continua navegando pra tela cheia (padrão WhatsApp em telefone). */
  const handleSelectMobile = async (item: ChatListItem) => {
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
    <div className="min-h-screen pb-24 lg:pb-8" style={{ background: 'var(--surface-0)' }}>
      {/* ── Mobile (padrão WhatsApp) ── */}
      <div className="lg:hidden">
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
            onSelect={(item) => void handleSelectMobile(item)}
            emptyLabel="Nenhuma conversa ainda. Toque em + para iniciar."
          />
        )}

        {novoChatOpen && (
          <NovoChatSheet
            alunos={conversas}
            onClose={() => setNovoChatOpen(false)}
            onSelect={(item) => void handleSelectMobile(item)}
          />
        )}
      </div>

      {/* ── Desktop (2 colunas, estilo WhatsApp — cores da marca AURON) ── */}
      <div className="hidden lg:flex" style={{ height: '100vh' }}>
        {/* Coluna esquerda — lista */}
        <div className="flex w-[360px] shrink-0 flex-col border-r border-border-subtle bg-surface-1">
          <div className="flex items-center justify-between gap-2 px-4 pt-4">
            <h1 className="text-xl font-extrabold text-text-primary">Conversas</h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setNovoChatOpen(true)}
                title="Novo chat"
                aria-label="Novo chat"
                className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
              >
                <Plus size={18} weight="bold" />
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  title="Mais opções"
                  aria-label="Mais opções"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
                >
                  <DotsThreeVertical size={18} weight="bold" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 z-20 mt-1.5 w-52 rounded-xl bg-surface-2 py-1 shadow-[0_8px_28px_rgba(0,0,0,0.28)]">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setEnviarMensagemOpen(true);
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-text-primary hover:bg-surface-1"
                      >
                        <PaperPlaneTilt size={15} /> Enviar mensagem
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Busca */}
          <div className="px-4 pt-3">
            <div className="field-flat-input flex items-center gap-2 rounded-2xl border border-border-subtle bg-surface-2 px-3.5 py-2.5">
              <MagnifyingGlass size={15} className="shrink-0 text-text-disabled" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar conversa"
                className="w-full border-0 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-disabled"
                style={{ touchAction: 'manipulation' }}
              />
            </div>
          </div>

          {/* Pills Tudo / Não lidas */}
          <div className="flex items-center gap-2 px-4 pb-3 pt-3">
            <button
              type="button"
              onClick={() => setTab('todas')}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                tab === 'todas' ? 'bg-brand text-white' : 'bg-surface-2 text-text-secondary hover:text-text-primary',
              )}
            >
              Tudo
            </button>
            <button
              type="button"
              onClick={() => setTab('nao-lidas')}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
                tab === 'nao-lidas' ? 'bg-brand text-white' : 'bg-surface-2 text-text-secondary hover:text-text-primary',
              )}
            >
              Não lidas
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto border-t border-border-subtle">
            {loading ? (
              <div className="flex justify-center py-16">
                <DumbbellLoader />
              </div>
            ) : erro ? (
              <p className="px-4 py-8 text-center text-sm text-danger">{erro}</p>
            ) : (
              <ChatList
                conversas={conversasFiltradas}
                conversaAtiva={selectedId ?? undefined}
                onSelect={(item) => setSelectedId(item.id)}
                emptyLabel={busca ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa ainda.'}
              />
            )}
          </div>
        </div>

        {/* Coluna direita — conversa aberta */}
        <div className="flex min-w-0 flex-1 flex-col">
          {selecionada && meuId ? (
            <InlineChatPanel
              key={selecionada.id}
              fullHeight
              conversaId={selecionada.id}
              meuId={meuId}
              alunoId={selecionada.alunoId}
              nomeOutro={selecionada.outro.full_name ?? 'Aluno'}
              avatarOutro={selecionada.outro.avatar_url}
              sexoOutro={selecionada.outro.sexo}
              onRead={() => {
                setConversas((prev) =>
                  prev.map((c) => (c.id === selecionada.id ? { ...c, nao_lidas: 0 } : c)),
                );
              }}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2" style={{ backgroundColor: 'var(--filter-bg, #ebebf0)' }}>
              <ChatsCircle size={40} className="text-text-disabled" />
              <p className="text-sm text-text-tertiary">Selecione uma conversa para começar</p>
            </div>
          )}
        </div>
      </div>

      {enviarMensagemOpen && (
        <EnviarMensagemModal
          alunos={conversas}
          onClose={() => setEnviarMensagemOpen(false)}
          onSent={(conversaId) => {
            setEnviarMensagemOpen(false);
            setTab('todas');
            setBusca('');
            setSelectedId(conversaId);
            void load();
          }}
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
