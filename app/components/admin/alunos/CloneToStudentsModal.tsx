'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, MagnifyingGlass, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { textIncludes } from '@/lib/utils/textNormalize';

export type CloneStudentOption = {
  id: string;
  nome: string;
};

type Props = {
  open: boolean;
  title?: string;
  subtitle?: string;
  students: CloneStudentOption[];
  loadingStudents?: boolean;
  confirming?: boolean;
  onClose: () => void;
  onConfirm: (studentIds: string[]) => void;
};

export function CloneToStudentsModal({
  open,
  title = 'Clonar para alunos',
  subtitle,
  students,
  loadingStudents,
  confirming,
  onClose,
  onConfirm,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setQ('');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(
    () =>
      students
        .filter((s) => !q.trim() || textIncludes(s.nome, q))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [students, q],
  );

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((s) => selected.has(s.id));

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((s) => next.delete(s.id));
      } else {
        filtered.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        className="w-full max-w-md max-h-[min(85vh,560px)] flex flex-col rounded-2xl bg-surface-1 shadow-elev-3 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border-divider shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-text-primary">{title}</h3>
            {subtitle && (
              <p className="text-[11px] text-text-tertiary mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary"
            aria-label="Fechar"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="px-4 py-2.5 shrink-0 flex items-center gap-2 border-b border-border-divider/60">
          <MagnifyingGlass size={14} weight="bold" className="text-brand shrink-0" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar aluno"
            className="flex-1 min-w-0 bg-transparent border-0 text-sm text-text-primary outline-none placeholder:text-text-disabled"
            style={{ fontSize: 16 }}
          />
        </div>

        <div className="px-4 py-2 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-text-tertiary">
            {selected.size} selecionado{selected.size === 1 ? '' : 's'}
          </p>
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={toggleAllFiltered}
              className="text-[11px] font-semibold text-brand hover:text-brand-hover"
            >
              {allFilteredSelected ? 'Limpar lista' : 'Selecionar lista'}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loadingStudents ? (
            <p className="px-4 py-8 text-center text-xs text-text-tertiary">
              Carregando alunos…
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-text-tertiary">
              Nenhum aluno encontrado.
            </p>
          ) : (
            <ul className="flex flex-col">
              {filtered.map((s) => {
                const on = selected.has(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => toggle(s.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        on ? 'bg-brand/10' : 'hover:bg-surface-2/60',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded',
                          on ? 'bg-brand text-text-on-brand' : 'bg-surface-2',
                        )}
                      >
                        {on && <Check size={10} weight="bold" />}
                      </span>
                      <span className="text-[13px] font-medium text-text-primary truncate">
                        {s.nome}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-border-divider shrink-0">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={onClose}
            disabled={confirming}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            disabled={selected.size === 0 || confirming}
            loading={confirming}
            onClick={() => onConfirm([...selected])}
          >
            Ok
          </Button>
        </div>
      </div>
    </div>
  );
}
