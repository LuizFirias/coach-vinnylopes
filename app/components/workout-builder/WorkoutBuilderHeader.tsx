"use client";

import { ArrowLeft, CircleNotch, FloppyDisk, Gear, FileArrowDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

interface AlunoOption {
  id: string;
  coaching_reference: string;
  email?: string;
}

interface WorkoutBuilderHeaderProps {
  isMobile: boolean;
  alunos: AlunoOption[];
  alunoSelecionado: string;
  nomeRotina: string;
  saving: boolean;
  exporting: boolean;
  canSave: boolean;
  isDirty: boolean;
  onBack: () => void;
  onAlunoChange: (id: string) => void;
  onRotinaChange: (nome: string) => void;
  onSave: () => void;
  onExportPdf?: () => void;
  onOpenSettings?: () => void;
}

const selectCls =
  "w-full bg-surface-2 border border-input text-text-primary px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-brand/40 h-9";
const inputCls =
  "w-full bg-surface-2 border border-input text-text-primary px-3 py-2 rounded-lg text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 h-9";

export function WorkoutBuilderHeader({
  isMobile,
  alunos,
  alunoSelecionado,
  nomeRotina,
  saving,
  exporting,
  canSave,
  isDirty,
  onBack,
  onAlunoChange,
  onRotinaChange,
  onSave,
  onExportPdf,
  onOpenSettings,
}: WorkoutBuilderHeaderProps) {
  const alunoLabel =
    alunos.find((a) => a.id === alunoSelecionado)?.coaching_reference || "Sem aluno";

  if (isMobile) {
    return (
      <div className="sticky top-0 z-20 bg-surface-0 border-b border-divider px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 shrink-0 rounded-lg bg-surface-1 border-0 flex items-center justify-center text-text-tertiary"
          >
            <ArrowLeft size={16} />
          </button>
          <button type="button" onClick={onOpenSettings} className="min-w-0 text-left flex-1">
            <p className="text-sm font-bold text-text-primary truncate">
              {nomeRotina || "Nova ficha"}
            </p>
            <p className="text-[11px] text-text-secondary truncate">{alunoLabel}</p>
          </button>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-9 h-9 shrink-0 rounded-lg border-0 flex items-center justify-center text-text-secondary"
        >
          <Gear size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-20 bg-surface-0 border-b border-divider px-4 md:px-0 py-3 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-lg bg-surface-1 border-0 flex items-center justify-center text-text-tertiary hover:text-brand transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-lg font-bold text-text-primary whitespace-nowrap">Nova ficha digital</h1>
        </div>

        <div className="flex flex-1 flex-col sm:flex-row gap-2 min-w-0">
          <select
            value={alunoSelecionado}
            onChange={(e) => onAlunoChange(e.target.value)}
            className={cn(selectCls, "sm:flex-1")}
          >
            <option value="">Selecione o aluno...</option>
            {alunos.map((aluno) => (
              <option key={aluno.id} value={aluno.id}>
                {aluno.coaching_reference}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={nomeRotina}
            onChange={(e) => onRotinaChange(e.target.value)}
            placeholder="Ex: Lower A"
            className={cn(inputCls, "sm:flex-1")}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              disabled={exporting || !canSave}
              className="inline-flex items-center gap-1.5 px-3 h-9 bg-surface-1 border-0 text-text-secondary rounded-lg text-xs font-semibold hover:text-brand disabled:opacity-50"
            >
              {exporting ? <CircleNotch size={14} className="animate-spin" /> : <FileArrowDown size={14} />}
              PDF
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !canSave || !isDirty}
            className="inline-flex items-center gap-1.5 px-4 h-9 bg-brand text-text-on-brand rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {saving ? <CircleNotch size={14} className="animate-spin" /> : <FloppyDisk size={14} />}
            {saving ? "Salvando..." : "Salvar ficha"}
          </button>
        </div>
      </div>
    </div>
  );
}
