'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import { getSafeSession } from '@/lib/authErrorHandler';
import { marcarMensagensLidas } from '@/lib/chat/actions';
import { useChat } from '@/lib/chat/realtime';
import { getPublicStorageUrl } from '@/lib/storageUrls';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';

type ChatWindowProps = {
  conversaId: string;
  meuId: string;
  nomeOutro: string;
  avatarOutro?: string | null;
  backHref: string;
};

export function ChatWindow({
  conversaId,
  meuId,
  nomeOutro,
  avatarOutro,
  backHref,
}: ChatWindowProps) {
  const { mensagens, loading, bottomRef, appendLocal } = useChat(conversaId);
  const avatarUrl = getPublicStorageUrl('avatars', avatarOutro ?? null);
  const initial = (nomeOutro[0] ?? '?').toUpperCase();

  useEffect(() => {
    if (!conversaId) return;
    void (async () => {
      const session = await getSafeSession();
      if (!session?.access_token) return;
      await marcarMensagensLidas(session.access_token, conversaId);
    })();
  }, [conversaId]);

  return (
    <div
      className="flex h-[100dvh] flex-col"
      style={{ background: 'var(--mobile-page-bg-solid, #fff)' }}
    >
      <div
        className="flex items-center gap-3 px-3 py-3"
        style={{ borderBottom: '1px solid var(--mobile-card-border, rgba(0,0,0,0.07))' }}
      >
        <Link
          href={backHref}
          className="flex h-9 w-9 items-center justify-center rounded-[10px]"
          style={{ color: 'var(--text-tertiary)' }}
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </Link>
        <div
          className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #c084fc, #9333ea)' }}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={nomeOutro}
              width={36}
              height={36}
              className="h-full w-full object-cover"
            />
          ) : (
            initial
          )}
        </div>
        <p
          className="min-w-0 flex-1 truncate"
          style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary, #1a1a1a)' }}
        >
          {nomeOutro}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
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
          mensagens.map((msg) => (
            <ChatBubble
              key={msg.id}
              texto={msg.texto}
              enviada_em={msg.enviada_em}
              minha={msg.remetente_id === meuId}
              lida={!!msg.lida_em}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput conversaId={conversaId} onSent={appendLocal} />
    </div>
  );
}
