'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { Barbell, Bell, Camera, ChatCircle, ForkKnife, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import { useBreakpoint } from '@/lib/hooks/useBreakpoint';
import {
  listNotificacoes,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
  type Notificacao,
} from '@/lib/notifications/queries';

type Props = {
  open: boolean;
  onClose: () => void;
  chatNaoLidas?: number;
  /** Âncora do botão (desktop = popover no canto). */
  anchorRef?: RefObject<HTMLElement | null>;
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

function iconeParaTipo(tipo: Notificacao['tipo']) {
  if (tipo === 'treino_iniciado') return Barbell;
  if (tipo === 'photos_reminder') return Camera;
  return ForkKnife;
}

/**
 * Notificações in-app do coach.
 * - `treino_iniciado` / dietas / fotos: só informativo por enquanto (sem navegação).
 * - Futuro: `metadata.acompanharTreino` + ficha/sessão → live view do treino.
 * - Chat: continua levando a `/admin/chat`.
 * - Ao abrir: marca notificações como lidas (bolinha some); histórico permanece na lista.
 */
export function CoachNotificationsPanel({
  open,
  onClose,
  chatNaoLidas = 0,
  anchorRef,
}: Props) {
  const router = useRouter();
  const isMobile = useBreakpoint('mobile');
  const panelRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [notifs, setNotifs] = useState<Notificacao[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setNotifs(await listNotificacoes(40));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      await marcarTodasNotificacoesLidas();
      await load();
    })();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || isMobile) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorRef?.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open, isMobile, onClose, anchorRef]);

  if (!open) return null;

  const empty = !loading && notifs.length === 0 && chatNaoLidas === 0;
  const usePopover = !isMobile;

  const handleNotifActivate = async (n: Notificacao) => {
    if (!n.lida_em) {
      await marcarNotificacaoLida(n.id);
      setNotifs((prev) =>
        prev.map((row) =>
          row.id === n.id ? { ...row, lida_em: new Date().toISOString() } : row,
        ),
      );
    }

    // Preparado para acompanhamento em tempo real (ainda desligado):
    // const meta = n.metadata ?? {};
    // if (n.tipo === 'treino_iniciado' && meta.acompanharTreino === true) {
    //   onClose();
    //   router.push(`/admin/aluno/${meta.alunoId}/treino-ao-vivo`);
    //   return;
    // }

    // Treino / dieta / fotos: só informativo — sem sair da tela.
    if (
      n.tipo === 'treino_iniciado' ||
      n.tipo === 'checkin_reminder' ||
      n.tipo === 'photos_reminder'
    ) {
      return;
    }

    if (n.link) {
      onClose();
      router.push(n.link);
    }
  };

  const panelBody = (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <Bell size={16} weight="bold" className="shrink-0 text-brand" />
          <p id="coach-notif-panel-title" className="text-sm font-bold text-text-primary">
            Notificações
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
        >
          <X size={16} weight="bold" />
        </button>
      </div>

      <div className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain">
        {loading && (
          <p className="px-4 py-8 text-center text-[12px] text-text-tertiary">Carregando…</p>
        )}

        {empty && (
          <p className="px-4 py-8 text-center text-[12px] text-text-tertiary">
            Nenhuma notificação por enquanto.
          </p>
        )}

        {!loading && chatNaoLidas > 0 && (
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push('/admin/chat');
            }}
            className="flex w-full items-start gap-3 border-b border-border-subtle/80 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/60 active:bg-surface-2"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
              <ChatCircle size={16} weight="bold" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-[13px] font-semibold text-text-primary">
                {chatNaoLidas} mensage{chatNaoLidas === 1 ? 'm' : 'ns'} não lida
                {chatNaoLidas === 1 ? '' : 's'}
              </span>
              <span className="mt-0.5 block text-[12px] text-text-secondary">
                Toque para abrir o chat.
              </span>
            </span>
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" />
          </button>
        )}

        {!loading &&
          notifs.map((n) => {
            const unread = !n.lida_em;
            const Icon = iconeParaTipo(n.tipo);
            const informativo =
              n.tipo === 'treino_iniciado' ||
              n.tipo === 'checkin_reminder' ||
              n.tipo === 'photos_reminder';

            return (
              <button
                key={n.id}
                type="button"
                onClick={() => void handleNotifActivate(n)}
                className={cn(
                  'flex w-full items-start gap-3 border-b border-border-subtle/80 px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-surface-2/60 active:bg-surface-2',
                  unread && 'bg-brand/[0.04]',
                  informativo && 'cursor-default',
                )}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <Icon size={16} weight="bold" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold text-text-primary">
                      {n.titulo}
                    </span>
                    <span className="shrink-0 text-[10px] text-text-tertiary">
                      {formatRelative(n.criada_em)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[12px] text-text-secondary line-clamp-3">
                    {n.corpo}
                  </span>
                  {n.tipo === 'treino_iniciado' && (
                    <span className="mt-1 block text-[10px] font-medium text-text-tertiary">
                      Aviso informativo — acompanhamento ao vivo em breve
                    </span>
                  )}
                </span>
                {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" />}
              </button>
            );
          })}
      </div>
    </>
  );

  if (usePopover) {
    return (
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="coach-notif-panel-title"
        className="absolute right-0 top-[calc(100%+8px)] z-[60] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border-0 bg-surface-1 shadow-[0_12px_40px_rgba(0,0,0,0.28)]"
      >
        {panelBody}
      </div>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 animate-backdrop-in bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="coach-notif-panel-title"
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto relative w-full max-w-md animate-sheet-up overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
        >
          {panelBody}
        </div>
      </div>
    </>
  );
}
