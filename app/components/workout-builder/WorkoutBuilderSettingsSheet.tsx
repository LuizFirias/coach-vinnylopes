"use client";

import { useState } from "react";
import { MagnifyingGlass, X, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

interface AlunoOption {
  id: string;
  coaching_reference: string;
}

interface WorkoutBuilderSettingsSheetProps {
  alunos: AlunoOption[];
  alunoSelecionado: string;
  nomeRotina: string;
  alunoLocked?: boolean;
  onAlunoChange: (id: string) => void;
  onRotinaChange: (nome: string) => void;
  onClose: () => void;
}

export function WorkoutBuilderSettingsSheet({
  alunos,
  alunoSelecionado,
  nomeRotina,
  alunoLocked = false,
  onAlunoChange,
  onRotinaChange,
  onClose,
}: WorkoutBuilderSettingsSheetProps) {
  const [busca, setBusca] = useState("");

  const alunoLabel =
    alunos.find((a) => a.id === alunoSelecionado)?.coaching_reference || "Sem aluno";

  const alunosFiltrados = busca.trim()
    ? alunos.filter((a) =>
        a.coaching_reference.toLowerCase().includes(busca.toLowerCase()),
      )
    : alunos;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-1 border-0 rounded-t-2xl w-full max-w-lg flex flex-col max-h-[85dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
          <h3 className="text-sm font-semibold text-text-primary">Aluno e rotina</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-2 text-text-tertiary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-4 overflow-y-auto flex-1 pb-4">
          {/* Seção Aluno */}
          <div className="rounded-xl border-0 bg-surface-2/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border-divider">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                Aluno
              </p>
            </div>

            {alunoLocked ? (
              <div className="px-4 py-3">
                <p className="text-sm font-medium text-text-primary truncate">{alunoLabel}</p>
              </div>
            ) : (
              <>
                {/* Busca */}
                <div className="px-3 py-2.5 border-b border-border-divider">
                  <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-3 h-9">
                    <MagnifyingGlass size={14} className="shrink-0 text-text-tertiary" />
                    <input
                      type="text"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar aluno..."
                      className="flex-1 bg-transparent border-0 outline-none text-sm text-text-primary placeholder:text-text-disabled"
                      autoComplete="off"
                    />
                    {busca && (
                      <button
                        type="button"
                        onClick={() => setBusca("")}
                        className="shrink-0 text-text-tertiary hover:text-text-primary"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de alunos */}
                <div className="max-h-55 overflow-y-auto">
                  {alunosFiltrados.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-text-tertiary text-center">
                      Nenhum aluno encontrado
                    </p>
                  ) : (
                    alunosFiltrados.map((a, idx) => {
                      const selected = a.id === alunoSelecionado;
                      const initials = a.coaching_reference
                        .split(" ")
                        .slice(0, 2)
                        .map((w) => w[0]?.toUpperCase() ?? "")
                        .join("");
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => onAlunoChange(a.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                            idx > 0 && "border-t border-border-divider",
                            selected ? "bg-brand/10" : "hover:bg-surface-3/50",
                          )}
                        >
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold",
                              selected
                                ? "bg-brand text-white"
                                : "bg-surface-3 text-text-secondary",
                            )}
                          >
                            {initials || "?"}
                          </div>
                          <span
                            className={cn(
                              "flex-1 text-sm font-medium truncate",
                              selected ? "text-brand" : "text-text-primary",
                            )}
                          >
                            {a.coaching_reference}
                          </span>
                          {selected && (
                            <Check size={14} className="shrink-0 text-brand" weight="bold" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          {/* Seção Nome da rotina */}
          <div className="rounded-xl border-0 bg-surface-2/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border-divider">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                Nome da rotina
              </p>
            </div>
            <div className="px-4 py-3">
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

        {/* Footer */}
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className={cn("btn-primary w-full h-10 rounded-lg text-xs font-semibold")}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
