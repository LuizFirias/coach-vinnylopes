"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass, X, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { BodyPortal, useLockBodyScroll } from "@/app/components/ui/BodyPortal";

interface AlunoOption {
  id: string;
  coaching_reference: string;
}

interface WorkoutBuilderSettingsSheetProps {
  alunos: AlunoOption[];
  alunoSelecionado: string;
  alunoLocked?: boolean;
  onAlunoChange: (id: string) => void;
  onClose: () => void;
}

/** Bottom sheet mobile — só seleção de aluno (ordem alfabética). */
export function WorkoutBuilderSettingsSheet({
  alunos,
  alunoSelecionado,
  alunoLocked = false,
  onAlunoChange,
  onClose,
}: WorkoutBuilderSettingsSheetProps) {
  const [busca, setBusca] = useState("");
  useLockBodyScroll(true);

  const alunoLabel =
    alunos.find((a) => a.id === alunoSelecionado)?.coaching_reference || "sem aluno";

  const alunosOrdenados = useMemo(
    () =>
      [...alunos].sort((a, b) =>
        a.coaching_reference.localeCompare(b.coaching_reference, "pt-BR"),
      ),
    [alunos],
  );

  const alunosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return alunosOrdenados;
    return alunosOrdenados.filter((a) =>
      a.coaching_reference.toLowerCase().includes(q),
    );
  }, [alunosOrdenados, busca]);

  return (
    <BodyPortal>
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-1 border-0 rounded-t-2xl w-full max-w-lg flex flex-col max-h-[85dvh]">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
          <h3 className="text-sm font-semibold text-text-primary">Selecionar aluno</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-2 text-text-tertiary border-0 bg-transparent"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-4 overflow-y-auto flex-1 pb-4">
          <div className="rounded-xl border-0 bg-surface-2/50 overflow-hidden">
            {alunoLocked ? (
              <div className="px-4 py-3">
                <p className="text-sm font-medium text-brand truncate">{alunoLabel}</p>
              </div>
            ) : (
              <>
                <div className="px-3 py-2.5 border-b border-border-divider">
                  <div className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 h-9">
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
                        className="shrink-0 text-text-tertiary hover:text-text-primary border-0 bg-transparent"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-55 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      onAlunoChange("");
                      onClose();
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-0",
                      !alunoSelecionado ? "bg-brand/10" : "hover:bg-surface-3/50 bg-transparent",
                    )}
                  >
                    <span
                      className={cn(
                        "flex-1 text-sm font-medium",
                        !alunoSelecionado ? "text-brand" : "text-text-secondary",
                      )}
                    >
                      sem aluno
                    </span>
                    {!alunoSelecionado && (
                      <Check size={14} className="shrink-0 text-brand" weight="bold" />
                    )}
                  </button>

                  {alunosFiltrados.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-text-tertiary text-center">
                      Nenhum aluno encontrado
                    </p>
                  ) : (
                    alunosFiltrados.map((a) => {
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
                          onClick={() => {
                            onAlunoChange(a.id);
                            onClose();
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-0 border-t border-border-divider",
                            selected ? "bg-brand/10" : "hover:bg-surface-3/50 bg-transparent",
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
        </div>

        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className={cn("btn-primary w-full h-10 rounded-lg text-xs font-semibold")}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
    </BodyPortal>
  );
}
