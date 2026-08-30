'use client';

import { useEffect, useMemo } from 'react';
import { getSafeSession } from '@/lib/authErrorHandler';
import { marcarMensagensLidas } from '@/lib/chat/actions';
import { useChat } from '@/lib/chat/realtime';
import { BackButton } from '@/app/components/ui/BackButton';
import { StudentAvatar } from '@/app/components/profile/StudentAvatar';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';

type ChatWindowProps = {
  conversaId: string;
  meuId: string;
  nomeOutro: string;
  avatarOutro?: string | null;
  sexoOutro?: string | null;
  backHref: string;
};

function dateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDateDivider(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function ChatWindow({
  conversaId,
  meuId,
  nomeOutro,
  avatarOutro,
  sexoOutro,
  backHref,
}: ChatWindowProps) {
  const { mensagens, loading, bottomRef, appendLocal } = useChat(conversaId);

  useEffect(() => {
    if (!conversaId) return;
    void (async () => {
      const session = await getSafeSession();
      if (!session?.access_token) return;
      await marcarMensagensLidas(session.access_token, conversaId);
    })();
  }, [conversaId]);

  // Agrupa por dia — insere um divisor de data antes da primeira mensagem de cada dia.
  const withDividers = useMemo(() => {
    let lastKey = '';
    return mensagens.map((msg) => {
      const key = dateKey(msg.enviada_em);
      const showDivider = key !== lastKey;
      lastKey = key;
      return { msg, showDivider };
    });
  }, [mensagens]);

  return (
    <div
      className="flex h-[100dvh] flex-col lg:h-[calc(100dvh-2rem)] lg:mx-auto lg:my-4 lg:w-full lg:max-w-3xl lg:rounded-2xl lg:border-0"
      style={{ background: 'var(--mobile-page-bg-solid, #fff)' }}
    >
      <div
        className="flex items-center gap-3 px-3 py-3 lg:rounded-t-2xl lg:px-5"
        style={{ borderBottom: '1px solid var(--mobile-card-border, rgba(0,0,0,0.07))' }}
      >
        <BackButton href={backHref} />
        <StudentAvatar
          name={nomeOutro}
          avatarUrl={avatarOutro}
          sexo={sexoOutro}
          sizeClassName="h-9 w-9"
        />
        <p
          className="min-w-0 flex-1 truncate"
          style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #1a1a1a)' }}
        >
          {nomeOutro}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6">
        {loading ? (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary, #bbb)', textAlign: 'center' }}>
            Carregando...
          </p>
        ) : mensagens.length === 0 ? (
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-tertiary, #bbb)',
              textAlign: 'center',
              marginTop: 40,
            }}
          >
            Nenhuma mensagem ainda. Diga olá!
          </p>
        ) : (
          withDividers.map(({ msg, showDivider }) => (
            <div key={msg.id}>
              {showDivider && (
                <p className="my-3 text-center text-[11px] font-medium text-text-tertiary">
                  {formatDateDivider(msg.enviada_em)}
                </p>
              )}
              <ChatBubble
                texto={msg.texto}
                enviada_em={msg.enviada_em}
                minha={msg.remetente_id === meuId}
                lida={!!msg.lida_em}
              />
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput conversaId={conversaId} onSent={appendLocal} />
    </div>
  );
}
