'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EnvelopeSimple, Plus, PaperPlaneTilt, CaretDown } from '@phosphor-icons/react';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { ChatList } from '@/app/components/chat/ChatList';
import { NovoChatSheet } from '@/app/components/chat/NovoChatSheet';
import { EnviarMensagemModal } from '@/app/components/chat/EnviarMensagemModal';
import { InlineChatPanel } from '@/app/components/chat/InlineChatPanel';
import { StudentAvatar } from '@/app/components/profile/StudentAvatar';
import { Select } from '@/components/ui/Select';
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
  const [alunoFiltro, setAlunoFiltro] = useState('todos');
  // Desktop: conversa expandida inline na lista (não navega pra outra tela)
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    if (alunoFiltro !== 'todos') list = list.filter((c) => c.alunoId === alunoFiltro);
    return list;
  }, [conversasAtivas, tab, alunoFiltro]);

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

  /** Desktop: expande/colapsa na mesma tela, sem navegar. */
  const handleToggleDesktop = (item: ChatListItem) => {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
  };

  const alunoFiltroOptions = [
    { value: 'todos', label: 'Todos os alunos' },
    ...[...conversas]
      .sort((a, b) => (a.outro.full_name ?? '').localeCompare(b.outro.full_name ?? '', 'pt-BR'))
      .map((c) => ({ value: c.alunoId, label: c.outro.full_name ?? 'Aluno' })),
  ];

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

      {/* ── Desktop (padrão Nutrium) ── */}
      <div className="hidden px-10 pt-4 lg:block">
        <div className="mx-auto w-full max-w-[min(1100px,96vw)]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setEnviarMensagemOpen(true)}
              className="auron-cta-btn inline-flex h-11 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold"
            >
              Enviar mensagem <PaperPlaneTilt size={15} weight="fill" />
            </button>

            <Select
              className="w-[220px]"
              value={alunoFiltro}
              onChange={setAlunoFiltro}
              options={alunoFiltroOptions}
            />
          </div>

          <div
            className="rounded-xl border-0 bg-surface-1 p-5"
            style={{ boxShadow: '0 3px 10px rgba(0,0,0,0.06)' }}
          >
            <div className="mb-4 flex items-center gap-5 border-b border-border-subtle pb-3">
              <button
                type="button"
                onClick={() => setTab('todas')}
                className={
                  'relative pb-3 text-sm font-semibold transition-colors ' +
                  (tab === 'todas' ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary')
                }
              >
                Todas as conversas
                {tab === 'todas' && (
                  <span className="absolute -bottom-[13px] left-0 right-0 h-[2px] bg-text-primary" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setTab('nao-lidas')}
                className={
                  'relative pb-3 text-sm font-semibold transition-colors ' +
                  (tab === 'nao-lidas' ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary')
                }
              >
                Não lidas
                {tab === 'nao-lidas' && (
                  <span className="absolute -bottom-[13px] left-0 right-0 h-[2px] bg-text-primary" />
                )}
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <DumbbellLoader />
              </div>
            ) : erro ? (
              <p className="py-8 text-center text-sm text-danger">{erro}</p>
            ) : conversasFiltradas.length === 0 ? (
              <div className="rounded-xl bg-surface-2/60 px-6 py-10 text-center">
                <EnvelopeSimple size={26} className="mx-auto mb-3 text-text-tertiary" />
                <p className="mb-1.5 text-sm font-bold text-text-primary">
                  Não existem mensagens para os filtros ativos
                </p>
                <p className="mx-auto max-w-sm text-xs text-text-tertiary">
                  Não foram encontradas mensagens para os filtros atuais. Altere os filtros
                  acima para obter melhores resultados ou envie uma nova mensagem.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {conversasFiltradas.map((item) => {
                  const isOpen = expandedId === item.id;
                  const unread = item.nao_lidas > 0;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'overflow-hidden rounded-xl border transition-colors',
                        isOpen ? 'border-brand/30' : 'border-border-subtle',
                        // Não lida: um pouco mais destacado, mesmo fechada
                        unread && !isOpen && 'border-brand/20 bg-[#F4EBFC]/50',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleDesktop(item)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2/60"
                      >
                        <div className="relative shrink-0">
                          <StudentAvatar
                            name={item.outro.full_name ?? 'Aluno'}
                            avatarUrl={item.outro.avatar_url}
                            sexo={item.outro.sexo}
                            sizeClassName="h-10 w-10"
                          />
                          {/* Dot vermelho — só some quando a conversa é aberta (marcada como lida) */}
                          {unread && (
                            <span
                              className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-danger ring-2 ring-surface-1"
                              aria-label={`${item.nao_lidas} mensagem${item.nao_lidas === 1 ? '' : 's'} não lida${item.nao_lidas === 1 ? '' : 's'}`}
                            />
                          )}
                        </div>
                        {/* Nome só — sem prévia da última mensagem (mensagem só aparece dentro do chat) */}
                        <p
                          className={cn(
                            'min-w-0 flex-1 truncate text-sm',
                            unread ? 'font-bold text-text-primary' : 'font-semibold text-text-primary',
                          )}
                        >
                          {item.outro.full_name ?? 'Aluno'}
                        </p>
                        <div className="flex shrink-0 items-center gap-3">
                          {item.ultima_msg_em && (
                            <span
                              className={cn(
                                'text-[11px]',
                                unread ? 'font-semibold text-text-primary' : 'text-text-tertiary',
                              )}
                            >
                              {new Date(item.ultima_msg_em).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                              })}{' '}
                              às{' '}
                              {new Date(item.ultima_msg_em).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                          <CaretDown
                            size={14}
                            className={cn(
                              'text-text-tertiary transition-transform',
                              isOpen && 'rotate-180',
                            )}
                          />
                        </div>
                      </button>

                      {isOpen && meuId && (
                        <InlineChatPanel
                          conversaId={item.id}
                          meuId={meuId}
                          onRead={() => {
                            setConversas((prev) =>
                              prev.map((c) => (c.id === item.id ? { ...c, nao_lidas: 0 } : c)),
                            );
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {enviarMensagemOpen && (
        <EnviarMensagemModal
          alunos={conversas}
          onClose={() => setEnviarMensagemOpen(false)}
          onSent={(conversaId) => {
            setEnviarMensagemOpen(false);
            setTab('todas');
            setAlunoFiltro('todos');
            setExpandedId(conversaId);
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
