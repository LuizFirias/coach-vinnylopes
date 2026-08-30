'use client';

import { useEffect, useMemo, useState } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import type { ChatListItem } from '@/lib/chat/queries';
import { StudentAvatar } from '@/app/components/profile/StudentAvatar';

type NovoChatSheetProps = {
  alunos: ChatListItem[];
  onClose: () => void;
  onSelect: (item: ChatListItem) => void;
};

export function NovoChatSheet({ alunos, onClose, onSelect }: NovoChatSheetProps) {
  const [q, setQ] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = [...alunos].sort((a, b) =>
      (a.outro.full_name ?? '').localeCompare(b.outro.full_name ?? '', 'pt-BR'),
    );
    if (!term) return list;
    return list.filter((a) => (a.outro.full_name ?? '').toLowerCase().includes(term));
  }, [alunos, q]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Novo chat"
        className="w-full max-w-md max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface-1, #111827)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--mobile-card-border, rgba(0,0,0,0.07))' }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            Novo chat
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="px-4 py-2.5 shrink-0 flex items-center gap-2">
          <MagnifyingGlass size={16} weight="bold" style={{ color: '#D4A843', flexShrink: 0 }} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar aluno"
            className="flex-1 outline-none text-sm rounded-xl px-3 py-2"
            style={{
              color: 'var(--text-primary)',
              background: 'transparent',
              border: '1px solid #D4A843',
            }}
            autoFocus
          />
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 pb-4">
          {filtered.length === 0 ? (
            <p
              className="px-4 py-8 text-center text-sm"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Nenhum aluno encontrado.
            </p>
          ) : (
            filtered.map((a) => {
              return (
                <button
                  key={a.alunoId}
                  type="button"
                  onClick={() => onSelect(a)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  style={{ touchAction: 'manipulation' }}
                >
                  <StudentAvatar
                    name={a.outro.full_name ?? 'Aluno'}
                    avatarUrl={a.outro.avatar_url}
                    sexo={a.outro.sexo}
                    sizeClassName="w-10 h-10"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {a.outro.full_name ?? 'Aluno'}
                    </p>
                    <p
                      className="text-[11px] truncate"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {a.pendingCreate
                        ? 'Iniciar conversa'
                        : a.ultima_msg
                          ? 'Abrir conversa'
                          : 'Sem mensagens'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
