'use client';

import type { ChatListItem } from '@/lib/chat/queries';
import { StudentAvatar } from '@/app/components/profile/StudentAvatar';

type ChatListProps = {
  conversas: ChatListItem[];
  conversaAtiva?: string;
  onSelect: (item: ChatListItem) => void;
  emptyLabel?: string;
};

export function ChatList({
  conversas,
  conversaAtiva,
  onSelect,
  emptyLabel = 'Nenhuma conversa ainda.',
}: ChatListProps) {
  if (conversas.length === 0) {
    return (
      <p
        className="px-4 py-10 text-center"
        style={{ fontSize: 13, color: 'var(--text-tertiary, #888)' }}
      >
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {conversas.map((c, idx) => {
        const active = conversaAtiva === c.id;
        const unread = c.nao_lidas > 0;

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
            <StudentAvatar
              name={c.outro.full_name ?? 'Aluno'}
              avatarUrl={c.outro.avatar_url}
              sexo={c.outro.sexo}
              sizeClassName="w-11 h-11"
            />

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
                    fontWeight: unread ? 700 : 600,
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
                      color: unread ? '#e05555' : 'var(--text-tertiary, #aaa)',
                      fontWeight: unread ? 600 : 400,
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
                    fontWeight: unread ? 700 : 400,
                    color: unread
                      ? 'var(--text-primary, #1a1a1a)'
                      : 'var(--text-secondary, #888)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 200,
                  }}
                >
                  {c.ultima_msg ?? 'Sem mensagens'}
                </p>
                {unread && (
                  <span
                    aria-label={`${c.nao_lidas} não lida${c.nao_lidas === 1 ? '' : 's'}`}
                    style={{
                      minWidth: 18,
                      height: 18,
                      padding: '0 5px',
                      borderRadius: 9,
                      background: 'var(--brand-primary, #9333ea)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
