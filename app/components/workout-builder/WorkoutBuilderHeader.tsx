"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { BackButton } from "@/app/components/ui/BackButton";
import { AUTH_UNDERLINE_INPUT } from "@/lib/auth/authFormStyles";

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

function AlunoSelectInline({
  alunos,
  value,
  onChange,
  disabled,
}: {
  alunos: AlunoOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const alunosOrdenados = [...alunos].sort((a, b) =>
    a.coaching_reference.localeCompare(b.coaching_reference, "pt-BR"),
  );
  const selected = alunosOrdenados.find((a) => a.id === value);
  const label = selected?.coaching_reference || "selecione um aluno";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Selecionar aluno"
        className={cn(
          AUTH_UNDERLINE_INPUT,
          "flex items-center justify-between gap-2 text-left cursor-pointer disabled:cursor-not-allowed",
          selected ? "text-text-primary" : "text-text-disabled font-normal",
        )}
      >
        <span className="truncate text-[15px] font-medium">{label}</span>
        <CaretDown
          size={14}
          weight="bold"
          className="text-brand shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-2 max-h-56 overflow-y-auto rounded-xl border border-brand-border bg-surface-2 p-1.5 shadow-[var(--elev-3)]"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center justify-between gap-2 text-left px-3 py-2.5 rounded-lg text-[13px] cursor-pointer border-0",
              !value
                ? "font-semibold bg-brand/15 text-brand"
                : "font-medium text-text-primary hover:bg-brand/10 bg-transparent",
            )}
          >
            <span>selecione um aluno</span>
            {!value && <Check size={14} weight="bold" />}
          </button>
          {alunosOrdenados.map((aluno) => {
            const active = aluno.id === value;
            return (
              <button
                key={aluno.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(aluno.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 text-left px-3 py-2.5 rounded-lg text-[13px] cursor-pointer border-0",
                  active
                    ? "font-semibold bg-brand/15 text-brand"
                    : "font-medium text-text-primary hover:bg-brand/10 bg-transparent",
                )}
              >
                <span className="truncate">{aluno.coaching_reference}</span>
                {active && <Check size={14} weight="bold" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function WorkoutBuilderHeader({
  isMobile,
  alunos,
  alunoSelecionado,
  nomeRotina,
  alunoLocked = false,
  onBack,
  onAlunoChange,
  onRotinaChange,
  onOpenAlunoPicker,
}: WorkoutBuilderHeaderProps) {
  const alunoLabel =
    alunos.find((a) => a.id === alunoSelecionado)?.coaching_reference || null;
  const hasAluno = Boolean(alunoSelecionado && alunoLabel);

  if (isMobile) {
    return (
      <div className="sticky top-0 z-20 bg-surface-0 border-0 py-3">
        <div className="flex items-start gap-2">
          <BackButton onClick={onBack} className="mt-0.5" />
          <div className="min-w-0 flex-1 flex flex-col">
            <input
              type="text"
              value={nomeRotina}
              onChange={(e) => onRotinaChange(e.target.value)}
              placeholder="nome da rotina"
              aria-label="Nome da rotina"
              className={cn(AUTH_UNDERLINE_INPUT, "h-10 font-semibold")}
            />
            {alunoLocked ? (
              <span
                className={cn(
                  AUTH_UNDERLINE_INPUT,
                  "flex items-center h-10 text-[13px] font-medium text-brand",
                )}
              >
                {alunoLabel || "selecione um aluno"}
              </span>
            ) : (
              <button
                type="button"
                onClick={onOpenAlunoPicker}
                className={cn(
                  "w-full h-10 flex items-center justify-between gap-2 bg-transparent border-0 border-b border-black/15 rounded-none px-0 text-left cursor-pointer",
                  hasAluno ? "text-brand font-medium" : "text-text-disabled font-normal",
                )}
                aria-label="Selecionar aluno"
              >
                <span className="truncate text-[13px]">
                  {hasAluno ? alunoLabel : "selecione um aluno"}
                </span>
                <CaretDown size={12} weight="bold" className="text-brand shrink-0" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-20 bg-surface-0 border-0 px-4 md:px-0 py-3 mb-4">
      <div className="flex items-start gap-3">
        <BackButton onClick={onBack} className="mt-2 shrink-0" />

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <input
            type="text"
            value={nomeRotina}
            onChange={(e) => onRotinaChange(e.target.value)}
            placeholder="nome da rotina"
            aria-label="Nome da rotina"
            className={cn(AUTH_UNDERLINE_INPUT, "font-semibold")}
          />
          {alunoLocked ? (
            <span
              className={cn(
                AUTH_UNDERLINE_INPUT,
                "flex items-center text-sm font-medium text-brand",
              )}
            >
              {alunoLabel || "selecione um aluno"}
            </span>
          ) : (
            <AlunoSelectInline
              alunos={alunos}
              value={alunoSelecionado}
              onChange={onAlunoChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
