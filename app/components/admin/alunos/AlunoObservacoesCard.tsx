'use client';

import { useEffect, useState } from 'react';
import { Eye, NotePencil, PencilSimple, Plus, Trash, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import {
  criarObservacao,
  excluirObservacao,
  listObservacoesAluno,
  type AlunoObservacao,
  type ObservacaoTipo,
} from '@/lib/observacoes/queries';
import { ObservacoesModal } from './ObservacoesModal';

type Props = {
  alunoId: string;
  coachId: string | null;
  /** Texto legado em profiles.orientacoes — migra na 1ª carga se a lista estiver vazia (só pra tipo 'nota') */
  legacyOrientacoes?: string | null;
  /** 'nota' (padrão, card "Observações"/"Notes") ou 'lesao' (card "Limitações/Lesões") */
  tipo?: ObservacaoTipo;
  /** Sobrescreve o título do cabeçalho — padrão varia por tipo */
  title?: string;
  /** Sobrescreve o placeholder do textarea/empty state */
  placeholder?: string;
  /** true = cabeçalho em faixa cinza (grid Everfit do desktop). Padrão: header simples (mobile). */
  panelHeader?: boolean;
  /** Só no modo panelHeader — quantos itens mostrar antes de "Ver todas" abrir o modal. */
  previewLimit?: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AlunoObservacoesCard({
  alunoId,
  coachId,
  legacyOrientacoes,
  tipo = 'nota',
  title,
  placeholder,
  panelHeader = false,
  previewLimit,
}: Props) {
  const resolvedTitle = title ?? (tipo === 'lesao' ? 'Limitações / Lesões' : 'Notas');
  const resolvedPlaceholder =
    placeholder ??
    (tipo === 'lesao'
      ? 'Registre lesões ou limitações do aluno…'
      : 'Escreva uma nota para o aluno…');
  const [itens, setItens] = useState<AlunoObservacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        let list = await listObservacoesAluno(alunoId, tipo);
        if (
          list.length === 0 &&
          tipo === 'nota' &&
          legacyOrientacoes?.trim() &&
          coachId
        ) {
          try {
            const seeded = await criarObservacao(alunoId, coachId, legacyOrientacoes.trim(), tipo);
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
  }, [alunoId, coachId, legacyOrientacoes, tipo]);

  async function handleSave() {
    if (!coachId || !draft.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const created = await criarObservacao(alunoId, coachId, draft, tipo);
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

  const headerRow = (
    <div
      className={cn(
        'flex items-center justify-between gap-2',
        panelHeader ? 'px-4 py-2.5 bg-surface-2/50 border-b border-border-subtle' : 'mb-2',
      )}
    >
      <p
        className={cn(
          'font-bold uppercase tracking-wider text-text-tertiary',
          panelHeader ? 'text-[11px] text-text-secondary' : 'text-[10px]',
        )}
      >
        {resolvedTitle}
      </p>
      {panelHeader ? (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label={`Editar ${resolvedTitle}`}
          className="inline-flex items-center gap-1 bg-transparent border-0 text-brand hover:text-brand-hover"
        >
          <PencilSimple size={13} weight="bold" />
        </button>
      ) : !editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Editar ${resolvedTitle}`}
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
  );

  // ── Modo painel Everfit (desktop): prévia enxuta + "Ver todas" abre o modal ──
  if (panelHeader) {
    const limite = previewLimit ?? itens.length;
    const preview = itens.slice(0, limite);
    const restantes = itens.length - preview.length;

    return (
      <div className="bg-surface-1 border-0 rounded-2xl overflow-hidden">
        {headerRow}
        <div className="px-4 py-3">
          {loading ? (
            <p className="text-[11px] text-text-tertiary">Carregando…</p>
          ) : itens.length === 0 ? (
            <p className="text-[11px] text-text-tertiary italic">
              {tipo === 'lesao' ? 'Nenhuma lesão registrada.' : 'Nenhuma nota.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {preview.map((obs) => (
                <div key={obs.id}>
                  <p className="text-[12.5px] text-text-primary leading-snug line-clamp-2">{obs.conteudo}</p>
                  <p className="mt-0.5 text-[10px] text-text-tertiary">{formatDate(obs.criada_em)}</p>
                </div>
              ))}
            </div>
          )}
          {restantes > 0 && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-2.5 bg-transparent border-0 text-[11px] font-semibold text-brand hover:text-brand-hover"
            >
              Ver todas ({itens.length})
            </button>
          )}
        </div>

        {modalOpen && (
          <ObservacoesModal
            alunoId={alunoId}
            coachId={coachId}
            tipo={tipo}
            title={resolvedTitle}
            itens={itens}
            onClose={() => setModalOpen(false)}
            onItensChange={setItens}
          />
        )}
      </div>
    );
  }

  // ── Modo mobile (inalterado) ──
  return (
    <div className="bg-surface-1 border-0 rounded-2xl overflow-hidden px-4 py-3 shadow-sm">
      {headerRow}

      <div>
      {editing && (
        <div className="mb-3 rounded-lg border border-border-subtle bg-surface-0/40 p-2.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={resolvedPlaceholder}
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
          {tipo === 'lesao'
            ? 'Nenhuma lesão registrada. Toque em Nova para adicionar.'
            : 'Nenhuma nota. Toque em Nova para adicionar.'}
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
    </div>
  );
}
