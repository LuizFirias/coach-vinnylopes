'use client';

import { useEffect, useState } from 'react';
import { Eye, NotePencil } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import {
  finalizarObservacao,
  listObservacoesAluno,
  marcarObservacaoVisualizada,
  type AlunoObservacao,
} from '@/lib/observacoes/queries';
import { AlunoObservacaoModal } from './AlunoObservacaoModal';

type Props = {
  alunoId: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AlunoObservacoesInbox({ alunoId }: Props) {
  const [itens, setItens] = useState<AlunoObservacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<AlunoObservacao | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listObservacoesAluno(alunoId).then((list) => {
      if (!cancelled) {
        setItens(list);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [alunoId]);

  const ativos = itens.filter((o) => !o.finalizada_em);

  if (loading || ativos.length === 0) return null;

  async function openItem(obs: AlunoObservacao) {
    setViewing(obs);
    if (!obs.visualizada_em) {
      await marcarObservacaoVisualizada(obs.id);
      setItens((prev) =>
        prev.map((o) =>
          o.id === obs.id ? { ...o, visualizada_em: new Date().toISOString() } : o,
        ),
      );
      setViewing((prev) =>
        prev && prev.id === obs.id ? { ...prev, visualizada_em: new Date().toISOString() } : prev,
      );
    }
  }

  async function handleConcluir(id: string) {
    await finalizarObservacao(id);
    setItens((prev) =>
      prev.map((o) => (o.id === id ? { ...o, finalizada_em: new Date().toISOString() } : o)),
    );
    setViewing(null);
  }

  const unread = ativos.filter((o) => !o.visualizada_em).length;

  return (
    <>
      <div className="mx-4 rounded-xl border-0 bg-surface-1 px-4 py-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary inline-flex items-center gap-1.5">
            <NotePencil size={12} weight="bold" className="text-brand" />
            Notas do personal
          </p>
          {unread > 0 && (
            <span className="text-[10px] font-semibold text-danger tabular-nums">
              {unread} nova{unread === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <ul className="flex max-h-[10.5rem] flex-col divide-y divide-[color:var(--list-row-divider)] overflow-y-auto overscroll-contain scrollbar-brand-thin pr-0.5">
          {ativos.map((obs) => {
            const viewed = Boolean(obs.visualizada_em);
            return (
              <li key={obs.id}>
                <button
                  type="button"
                  onClick={() => void openItem(obs)}
                  className="flex w-full items-start gap-2 py-2.5 text-left bg-transparent border-0"
                >
                  <span className="min-w-0 flex-1">
                    <p className="text-[12px] text-text-primary leading-snug line-clamp-2">
                      {obs.conteudo}
                    </p>
                    <p className="mt-0.5 text-[10px] text-text-tertiary">
                      {formatDate(obs.criada_em)}
                    </p>
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center',
                      viewed ? 'text-success' : 'text-danger',
                    )}
                  >
                    <Eye size={15} weight={viewed ? 'fill' : 'bold'} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <AlunoObservacaoModal
        observacao={viewing}
        onClose={() => setViewing(null)}
        onConcluir={handleConcluir}
      />
    </>
  );
}
