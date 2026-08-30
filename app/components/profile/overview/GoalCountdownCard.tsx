'use client';

import { useEffect, useState } from 'react';
import { PencilSimple, Target, X, Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import {
  fetchObjetivoAtual,
  salvarObjetivo,
  type AlunoObjetivo,
} from '@/lib/objetivos/queries';
import { OverviewPanel } from './OverviewPanel';

interface GoalCountdownCardProps {
  alunoId: string;
  coachId: string | null;
}

function diasRestantes(dataAlvo: string): number {
  const alvo = new Date(dataAlvo + 'T00:00:00');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((alvo.getTime() - hoje.getTime()) / 86400000);
}

export function GoalCountdownCard({ alunoId, coachId }: GoalCountdownCardProps) {
  const [objetivo, setObjetivo] = useState<AlunoObjetivo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataAlvo, setDataAlvo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const atual = await fetchObjetivoAtual(alunoId);
      if (!cancelled) {
        setObjetivo(atual);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [alunoId]);

  function startEdit() {
    setTitulo(objetivo?.titulo ?? '');
    setDescricao(objetivo?.descricao ?? '');
    setDataAlvo(objetivo?.data_alvo ?? '');
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    if (!coachId || !titulo.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const salvo = await salvarObjetivo({
        id: objetivo?.id,
        alunoId,
        coachId,
        titulo,
        descricao,
        dataAlvo: dataAlvo || null,
      });
      if (salvo) {
        setObjetivo(salvo);
        setEditing(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  const dias = objetivo?.data_alvo ? diasRestantes(objetivo.data_alvo) : null;

  return (
    <OverviewPanel
      title="Objetivo e contagem regressiva"
      action={
        !editing && (
          <button
            type="button"
            onClick={startEdit}
            aria-label="Editar objetivo"
            className="text-brand hover:text-brand-hover bg-transparent border-0"
          >
            <PencilSimple size={13} weight="bold" />
          </button>
        )
      }
    >
      {loading ? (
        <p className="text-[11px] text-text-tertiary">Carregando…</p>
      ) : editing ? (
        <div className="flex flex-col gap-2">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Objetivo (ex.: Correr 10km sem parar)"
            className="w-full rounded-lg border border-border-subtle bg-transparent px-2.5 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand"
          />
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Detalhes (opcional)"
            rows={2}
            className="w-full resize-none rounded-lg border border-border-subtle bg-transparent px-2.5 py-2 text-[12px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand"
          />
          <input
            type="date"
            value={dataAlvo}
            onChange={(e) => setDataAlvo(e.target.value)}
            className="w-full rounded-lg border border-border-subtle bg-transparent px-2.5 py-2 text-[12px] text-text-primary outline-none focus:border-brand"
          />
          {error && <p className="text-[11px] text-danger">{error}</p>}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1 bg-transparent border-0 text-[11px] font-medium text-text-tertiary hover:text-text-primary"
            >
              <X size={12} weight="bold" />
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving || !titulo.trim()}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-1 bg-transparent border-0 text-[11px] font-semibold text-brand disabled:opacity-40"
            >
              <Check size={12} weight="bold" />
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      ) : objetivo ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand shrink-0">
              <Target size={16} weight="bold" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-text-primary leading-snug">{objetivo.titulo}</p>
              {objetivo.descricao && (
                <p className="mt-0.5 text-[11px] text-text-tertiary leading-snug">{objetivo.descricao}</p>
              )}
            </div>
          </div>
          {dias != null && (
            <div
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-center text-[11px] font-semibold',
                dias < 0 ? 'bg-danger/10 text-danger' : dias <= 7 ? 'bg-warning/10 text-warning' : 'bg-brand/10 text-brand',
              )}
            >
              {dias < 0
                ? `Venceu há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? '' : 's'}`
                : dias === 0
                  ? 'É hoje!'
                  : `${dias} dia${dias === 1 ? '' : 's'} restantes`}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-3 text-center">
          <Target size={18} className="text-text-disabled" />
          <p className="text-[11px] text-text-tertiary">Nenhum objetivo definido ainda.</p>
          <button
            type="button"
            onClick={startEdit}
            className="text-[11px] font-semibold text-brand hover:text-brand-hover bg-transparent border-0"
          >
            + Definir objetivo
          </button>
        </div>
      )}
    </OverviewPanel>
  );
}
