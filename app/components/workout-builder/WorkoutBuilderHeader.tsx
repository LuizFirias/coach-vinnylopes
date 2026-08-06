"use client";

import { CircleNotch, FloppyDisk, FileArrowDown } from "@phosphor-icons/react";
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
  /** Abre seletor de aluno (mobile) */
  onOpenAlunoPicker?: () => void;
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
  onOpenAlunoPicker,
}: WorkoutBuilderHeaderProps) {
  const alunoLabel =
    alunos.find((a) => a.id === alunoSelecionado)?.coaching_reference || null;
  const hasAluno = Boolean(alunoSelecionado && alunoLabel);

  if (isMobile) {
    return (
      <div className="sticky top-0 z-20 bg-surface-0 border-0 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <BackButton onClick={onBack} />
          <input
            type="text"
            value={nomeRotina}
            onChange={(e) => onRotinaChange(e.target.value)}
            placeholder={alunoLocked ? "Editar ficha" : "Nova ficha"}
            aria-label="Nome da ficha"
            className="min-w-0 flex-1 bg-transparent border-0 outline-none shadow-none text-[15.4px] font-bold text-text-primary placeholder:text-text-disabled placeholder:font-semibold p-0"
          />
        </div>

        {alunoLocked ? (
          <span className="shrink-0 max-w-[42%] text-[12px] font-medium text-brand truncate text-right">
            {alunoLabel || "sem aluno"}
          </span>
        ) : (
          <button
            type="button"
            onClick={onOpenAlunoPicker}
            className="shrink-0 max-w-[42%] text-[12px] font-medium text-brand truncate text-right border-0 bg-transparent p-0 cursor-pointer"
            aria-label="Selecionar aluno"
          >
            {hasAluno ? alunoLabel : "sem aluno"}
          </button>
        )}
      </div>
    );
  }

  const alunosOrdenados = [...alunos].sort((a, b) =>
    a.coaching_reference.localeCompare(b.coaching_reference, "pt-BR"),
  );

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
                <p className="text-sm text-brand truncate">{alunoLabel || "sem aluno"}</p>
              ) : (
                <select
                  value={alunoSelecionado}
                  onChange={(e) => onAlunoChange(e.target.value)}
                  className={cn(
                    "w-full bg-transparent border-0 outline-none shadow-none text-sm appearance-none cursor-pointer p-0",
                    alunoSelecionado ? "text-text-primary" : "text-brand",
                  )}
                >
                  <option value="">sem aluno</option>
                  {alunosOrdenados.map((aluno) => (
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
                placeholder="Nova ficha"
                className="w-full bg-transparent border-0 outline-none shadow-none text-[15.4px] font-bold text-text-primary placeholder:text-text-disabled p-0"
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
