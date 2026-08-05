"use client";

import { CircleNotch, FloppyDisk, Gear, FileArrowDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { BackButton } from "@/app/components/ui/BackButton";

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
  /** Em edição, o aluno não pode ser trocado */
  alunoLocked?: boolean;
  saveLabel?: string;
  onBack: () => void;
  onAlunoChange: (id: string) => void;
  onRotinaChange: (nome: string) => void;
  onSave: () => void;
  onExportPdf?: () => void;
  onOpenSettings?: () => void;
}

export function WorkoutBuilderHeader({
  isMobile,
  alunos,
  alunoSelecionado,
  nomeRotina,
  saving,
  exporting,
  canSave,
  isDirty,
  alunoLocked = false,
  saveLabel = "Salvar ficha",
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
      <div className="sticky top-0 z-20 bg-surface-0 border-0 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <BackButton onClick={onBack} />
          <button type="button" onClick={onOpenSettings} className="min-w-0 text-left flex-1">
            <p className="text-sm font-bold text-text-primary truncate">
              {nomeRotina || (alunoLocked ? "Editar ficha" : "Nova ficha")}
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
    <div className="sticky top-0 z-20 bg-surface-0 border-0 px-4 md:px-0 py-3 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-3 shrink-0">
          <BackButton onClick={onBack} />
        </div>

        <div className="field-flat-input flex-1 min-w-0 rounded-2xl border-0 bg-surface-1 overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="px-4 py-2.5 sm:border-r sm:border-border-divider">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-1">
                Aluno
              </label>
              {alunoLocked ? (
                <p className="text-sm text-text-primary truncate">{alunoLabel}</p>
              ) : (
                <select
                  value={alunoSelecionado}
                  onChange={(e) => onAlunoChange(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none shadow-none text-sm text-text-primary appearance-none cursor-pointer p-0"
                >
                  <option value="">Selecione o aluno...</option>
                  {alunos.map((aluno) => (
                    <option key={aluno.id} value={aluno.id}>
                      {aluno.coaching_reference}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="px-4 py-2.5 border-t border-border-divider sm:border-t-0">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-1">
                Nome da rotina
              </label>
              <input
                type="text"
                value={nomeRotina}
                onChange={(e) => onRotinaChange(e.target.value)}
                placeholder="Ex: Lower A"
                className="w-full bg-transparent border-0 outline-none shadow-none text-sm text-text-primary placeholder:text-text-disabled p-0"
              />
            </div>
          </div>
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
            className={cn(
              "btn-primary inline-flex items-center gap-1.5 px-4 h-9 text-xs font-semibold rounded-lg disabled:opacity-40",
            )}
          >
            {saving ? <CircleNotch size={14} className="animate-spin" /> : <FloppyDisk size={14} />}
            {saving ? "Salvando..." : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
