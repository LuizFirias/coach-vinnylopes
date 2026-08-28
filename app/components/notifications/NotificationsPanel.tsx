'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Camera, ChatCircle, ForkKnife, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import {
  listChatNaoLidasAluno,
  listNotificacoes,
  marcarNotificacaoLida,
  type Notificacao,
} from '@/lib/notifications/queries';

type ChatUnreadItem = {
  conversaId: string;
  ultimaMsg: string | null;
  ultimaMsgEm: string | null;
  naoLidas: number;
  coachNome: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  alunoId: string;
};

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffMin = Math.floor((Date.now() - t) / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function NotificationsPanel({ open, onClose, alunoId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifs, setNotifs] = useState<Notificacao[]>([]);
  const [chats, setChats] = useState<ChatUnreadItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [n, c] = await Promise.all([
        listNotificacoes(40),
        listChatNaoLidasAluno(alunoId),
      ]);
      setNotifs(n);
      setChats(c);
    } finally {
      setLoading(false);
    }
  }, [alunoId]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const empty = !loading && notifs.length === 0 && chats.length === 0;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] animate-backdrop-in"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="notif-panel-title"
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 shadow-[0_20px_60px_rgba(0,0,0,0.35)] animate-sheet-up"
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-border-divider">
            <div className="flex items-center gap-2 min-w-0">
              <Bell size={16} weight="bold" className="text-brand shrink-0" />
              <p
                id="notif-panel-title"
                className="text-sm font-bold text-text-primary"
              >
                Notificações
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
            >
              <X size={16} weight="bold" />
            </button>
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain">
            {loading && (
              <p className="px-4 py-8 text-center text-[12px] text-text-tertiary">
                Carregando…
              </p>
            )}

            {empty && (
              <p className="px-4 py-8 text-center text-[12px] text-text-tertiary">
                Nenhuma notificação por enquanto.
              </p>
            )}

            {!loading &&
              chats.map((chat) => (
                <button
                  key={`chat-${chat.conversaId}`}
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(`/aluno/chat/${chat.conversaId}`);
                  }}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left border-b border-border-divider transition-colors hover:bg-surface-2/60 active:bg-surface-2"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <ChatCircle size={16} weight="bold" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-text-primary truncate">
                        Nova mensagem
                        {chat.coachNome ? ` · ${chat.coachNome.split(' ')[0]}` : ''}
                      </span>
                      <span className="text-[10px] text-text-tertiary shrink-0">
                        {formatRelative(chat.ultimaMsgEm)}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[12px] text-text-secondary line-clamp-2">
                      {chat.ultimaMsg || 'Abra o chat para ver a conversa.'}
                    </span>
                    {chat.naoLidas > 1 && (
                      <span className="mt-1 inline-block text-[10px] font-semibold text-brand">
                        {chat.naoLidas} não lidas
                      </span>
                    )}
                  </span>
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" />
                </button>
              ))}

            {!loading &&
              notifs.map((n) => {
                const unread = !n.lida_em;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={async () => {
                      if (unread) await marcarNotificacaoLida(n.id);
                      onClose();
                      if (n.link) router.push(n.link);
                    }}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3.5 text-left border-b border-border-divider transition-colors hover:bg-surface-2/60 active:bg-surface-2',
                      unread && 'bg-brand/[0.04]',
                    )}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                      {n.tipo === 'photos_reminder' ? (
                        <Camera size={16} weight="bold" />
                      ) : (
                        <ForkKnife size={16} weight="bold" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-text-primary truncate">
                          {n.titulo}
                        </span>
                        <span className="text-[10px] text-text-tertiary shrink-0">
                          {formatRelative(n.criada_em)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[12px] text-text-secondary line-clamp-3">
                        {n.corpo}
                      </span>
                    </span>
                    {unread && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" />
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </>
  );
}
