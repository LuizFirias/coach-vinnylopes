'use client';

import Image from 'next/image';
import type { ChatListItem } from '@/lib/chat/queries';
import { getPublicStorageUrl } from '@/lib/storageUrls';

type ChatListProps = {
  conversas: ChatListItem[];
  conversaAtiva?: string;
  onSelect: (item: ChatListItem) => void;
};

export function ChatList({ conversas, conversaAtiva, onSelect }: ChatListProps) {
  if (conversas.length === 0) {
    return (
      <p
        className="px-4 py-10 text-center"
        style={{ fontSize: 13, color: 'var(--text-tertiary, #888)' }}
      >
        Nenhum aluno para conversar ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {conversas.map((c, idx) => {
        const avatar = getPublicStorageUrl('avatars', c.outro.avatar_url);
        const initial = (c.outro.full_name?.[0] ?? '?').toUpperCase();
        const active = conversaAtiva === c.id;

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: active ? 'var(--brand-subtle, #faf5ff)' : 'transparent',
              border: 'none',
              borderBottom:
                idx < conversas.length - 1
                  ? '1px solid rgba(0,0,0,0.06)'
                  : 'none',
              cursor: 'pointer',
              textAlign: 'left',
              touchAction: 'manipulation',
              width: '100%',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                flexShrink: 0,
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #c084fc, #751BB4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              {avatar ? (
                <Image
                  src={avatar}
                  alt=""
                  width={44}
                  height={44}
                  className="h-full w-full object-cover"
                />
              ) : (
                initial
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 2,
                  gap: 8,
                }}
              >
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text-primary, #1a1a1a)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.outro.full_name ?? 'Aluno'}
                </p>
                {c.ultima_msg_em && (
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary, #aaa)',
                      flexShrink: 0,
                    }}
                  >
                    {new Date(c.ultima_msg_em).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary, #888)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 200,
                  }}
                >
                  {c.ultima_msg ?? 'Sem mensagens'}
                </p>
                {c.nao_lidas > 0 && (
                  <span
                    style={{
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      background: '#751BB4',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      flexShrink: 0,
                    }}
                  >
                    {c.nao_lidas > 99 ? '99+' : c.nao_lidas}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
