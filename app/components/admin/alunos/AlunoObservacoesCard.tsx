'use client';

import { useEffect, useState } from 'react';
import { Eye, NotePencil, Plus, Trash, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import {
  criarObservacao,
  excluirObservacao,
  listObservacoesAluno,
  type AlunoObservacao,
} from '@/lib/observacoes/queries';

type Props = {
  alunoId: string;
  coachId: string | null;
  /** Texto legado em profiles.orientacoes — migra na 1ª carga se a lista estiver vazia */
  legacyOrientacoes?: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AlunoObservacoesCard({ alunoId, coachId, legacyOrientacoes }: Props) {
  const [itens, setItens] = useState<AlunoObservacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        let list = await listObservacoesAluno(alunoId);
        if (
          list.length === 0 &&
          legacyOrientacoes?.trim() &&
          coachId
        ) {
          try {
            const seeded = await criarObservacao(alunoId, coachId, legacyOrientacoes.trim());
            if (seeded) list = [seeded];
          } catch {
            // ignora seed se migration ainda não rodou
          }
        }
        if (!cancelled) setItens(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [alunoId, coachId, legacyOrientacoes]);

  async function handleSave() {
    if (!coachId || !draft.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const created = await criarObservacao(alunoId, coachId, draft);
      if (created) {
        setItens((prev) => [created, ...prev]);
        setDraft('');
        setEditing(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Excluir esta observação?')) return;
    try {
      await excluirObservacao(id);
      setItens((prev) => prev.filter((o) => o.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (err: any) {
      setError(err?.message || 'Erro ao excluir');
    }
  }

  return (
    <div className="bg-surface-1 border-0 rounded-2xl px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          Observações
        </p>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 bg-transparent border-0 text-[11px] font-semibold text-brand hover:text-brand-hover"
          >
            <Plus size={12} weight="bold" />
            Nova
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setDraft('');
              setError(null);
            }}
            className="inline-flex items-center gap-1 bg-transparent border-0 text-[11px] font-medium text-text-tertiary hover:text-text-primary"
          >
            <X size={12} weight="bold" />
            Cancelar
          </button>
        )}
      </div>

      {editing && (
        <div className="mb-3 rounded-lg border border-border-subtle bg-surface-0/40 p-2.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escreva uma observação para o aluno…"
            rows={3}
            className="w-full resize-none bg-transparent border-0 outline-none text-[12px] text-text-primary placeholder:text-text-tertiary leading-relaxed"
          />
          <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-border-divider/60">
            <button
              type="button"
              disabled={saving || !draft.trim()}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-1 bg-transparent border-0 text-[11px] font-semibold text-brand disabled:opacity-40"
            >
              <NotePencil size={12} weight="bold" />
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mb-2 text-[11px] text-danger">{error}</p>
      )}

      {loading ? (
        <p className="py-2 text-[11px] text-text-tertiary">Carregando…</p>
      ) : itens.length === 0 && !editing ? (
        <p className="py-2 text-[11px] text-text-tertiary italic">
          Nenhuma observação. Toque em Nova para adicionar.
        </p>
      ) : (
        <ul className="flex max-h-[10.5rem] flex-col divide-y divide-[color:var(--list-row-divider)] overflow-y-auto overscroll-contain scrollbar-brand-thin pr-0.5">
          {itens.map((obs) => {
            const viewed = Boolean(obs.visualizada_em);
            const open = expandedId === obs.id;
            return (
              <li key={obs.id} className="py-2 first:pt-0.5 last:pb-0.5">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : obs.id)}
                    className={cn(
                      'min-w-0 flex-1 text-left bg-transparent border-0 p-0',
                      obs.finalizada_em && 'opacity-50',
                    )}
                  >
                    <p
                      className={cn(
                        'text-[12px] text-text-primary leading-snug',
                        !open && 'line-clamp-2',
                      )}
                    >
                      {obs.conteudo}
                    </p>
                    <p className="mt-0.5 text-[10px] text-text-tertiary">
                      {formatDate(obs.criada_em)}
                      {obs.finalizada_em && ' · Concluída pelo aluno'}
                    </p>
                  </button>

                  <span
                    title={viewed ? 'Visualizada pelo aluno' : 'Ainda não visualizada'}
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                      viewed ? 'text-success' : 'text-danger',
                    )}
                  >
                    <Eye size={15} weight={viewed ? 'fill' : 'bold'} />
                  </span>

                  <button
                    type="button"
                    aria-label="Excluir observação"
                    onClick={() => void handleDelete(obs.id)}
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:text-danger hover:bg-danger/5 bg-transparent border-0"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
