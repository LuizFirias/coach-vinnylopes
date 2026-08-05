'use client';

import { useEffect } from 'react';
import { X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export type PlanMetaDraft = {
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  orientacoes_gerais: string;
};

type Props = {
  open: boolean;
  draft: PlanMetaDraft;
  onChange: (next: PlanMetaDraft) => void;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
};

export const PLAN_GOAL_OPTIONS = [
  { value: 'Hipertrofia', label: 'Hipertrofia' },
  { value: 'Emagrecimento', label: 'Emagrecimento' },
  { value: 'Definição', label: 'Definição' },
  { value: 'Manutenção', label: 'Manutenção' },
  { value: 'Recomposição', label: 'Recomposição' },
  { value: 'Performance', label: 'Performance' },
  { value: 'Condicionamento', label: 'Condicionamento' },
  { value: 'Saúde', label: 'Saúde' },
  { value: 'Outro', label: 'Outro' },
];

const GOAL_VALUES = new Set(PLAN_GOAL_OPTIONS.map((o) => o.value));

export function PlanEditMetaModal({
  open,
  draft,
  onChange,
  onClose,
  onSave,
  saving,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const goalInList = GOAL_VALUES.has(draft.goal) && draft.goal !== 'Outro';
  const goalSelectValue = goalInList ? draft.goal : 'Outro';
  const customGoal = goalInList ? '' : draft.goal === 'Outro' ? '' : draft.goal;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/55"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-label="Editar nome e objetivo do plano"
        className="w-full max-w-md max-h-[min(90vh,640px)] flex flex-col rounded-2xl bg-surface-1 shadow-elev-3 overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--list-row-divider)] shrink-0 rounded-t-2xl">
          <h3 className="text-sm font-bold text-text-primary">Nome e objetivo</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary"
            aria-label="Fechar"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
          <Input
            label="Nome do plano"
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            placeholder="Ex: Bulking limpo — fase 1"
            helperText="Editável — personalize como preferir"
            className="!h-10 !text-sm"
          />
          <Select
            label="Objetivo"
            helperText="Lista padrão do Auron"
            value={goalSelectValue}
            onChange={(v) => {
              if (v === 'Outro') {
                onChange({ ...draft, goal: customGoal || 'Outro' });
                return;
              }
              onChange({ ...draft, goal: v });
            }}
            options={PLAN_GOAL_OPTIONS}
            placeholder="Selecionar"
          />
          {goalSelectValue === 'Outro' && (
            <Input
              label="Objetivo personalizado"
              value={draft.goal === 'Outro' ? '' : draft.goal}
              onChange={(e) =>
                onChange({
                  ...draft,
                  goal: e.target.value.trim() ? e.target.value : 'Outro',
                })
              }
              placeholder="Descreva o objetivo"
              className="!h-10 !text-sm"
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Início"
              type="date"
              value={draft.start_date}
              onChange={(e) => onChange({ ...draft, start_date: e.target.value })}
              className="!h-10 !text-sm"
            />
            <Input
              label="Término"
              type="date"
              value={draft.end_date}
              onChange={(e) => onChange({ ...draft, end_date: e.target.value })}
              className="!h-10 !text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
              Orientações gerais
            </label>
            <textarea
              value={draft.orientacoes_gerais}
              onChange={(e) => onChange({ ...draft, orientacoes_gerais: e.target.value })}
              rows={4}
              placeholder="Observações para o aluno..."
              className="w-full px-3.5 py-2.5 rounded-[10px] bg-surface-2 border-0 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-1 focus:ring-brand/30 resize-none"
              style={{ fontSize: 16, touchAction: 'manipulation' }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[color:var(--list-row-divider)] shrink-0 rounded-b-2xl">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onSave}
            loading={saving}
            disabled={saving || !draft.name.trim()}
          >
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
