"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaretDown, Check, MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

interface AlunoOption {
  id: string;
  coaching_reference: string;
}

interface AlunoAvatarPickerProps {
  alunos: AlunoOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

function initials(nome: string): string {
  return (
    nome
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/** Campo "Aluno" compacto — avatar (iniciais) + nome + busca ancorada.
 *  Usado tanto no mobile quanto no desktop, na linha dos botões de salvar. */
export function AlunoAvatarPicker({ alunos, value, onChange, disabled, className }: AlunoAvatarPickerProps) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const alunosOrdenados = useMemo(
    () => [...alunos].sort((a, b) => a.coaching_reference.localeCompare(b.coaching_reference, "pt-BR")),
    [alunos],
  );
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return alunosOrdenados;
    return alunosOrdenados.filter((a) => a.coaching_reference.toLowerCase().includes(q));
  }, [alunosOrdenados, busca]);

  const selected = alunosOrdenados.find((a) => a.id === value);

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
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Selecionar aluno"
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-xl border border-border-subtle bg-surface-1 px-3 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          !disabled && "hover:bg-surface-2",
        )}
      >
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
            selected ? "bg-brand text-white" : "bg-surface-3 text-text-tertiary",
          )}
        >
          {selected ? initials(selected.coaching_reference) : "?"}
        </span>
        <span
          className={cn(
            "flex-1 truncate text-xs font-semibold",
            selected ? "text-text-primary" : "text-text-disabled font-normal",
          )}
        >
          {selected?.coaching_reference || "Selecionar aluno"}
        </span>
        {!disabled && <CaretDown size={12} weight="bold" className="shrink-0 text-text-tertiary" />}
      </button>

      {open && !disabled && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-full min-w-64 overflow-hidden rounded-xl border border-border-subtle bg-surface-1 shadow-elev-3"
        >
          <div className="border-b border-divider p-2">
            <div className="flex h-8 items-center gap-2 rounded-lg bg-surface-2 px-2.5">
              <MagnifyingGlass size={13} className="shrink-0 text-text-tertiary" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar aluno..."
                className="flex-1 bg-transparent border-0 outline-none text-xs text-text-primary placeholder:text-text-disabled"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtrados.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-text-tertiary">Nenhum aluno encontrado</p>
            ) : (
              filtrados.map((a) => {
                const active = a.id === value;
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(a.id);
                      setOpen(false);
                      setBusca("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 border-0 px-3 py-2 text-left transition-colors",
                      active ? "bg-brand/10" : "bg-transparent hover:bg-surface-2",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        active ? "bg-brand text-white" : "bg-surface-3 text-text-secondary",
                      )}
                    >
                      {initials(a.coaching_reference)}
                    </span>
                    <span className={cn("flex-1 truncate text-xs font-medium", active ? "text-brand" : "text-text-primary")}>
                      {a.coaching_reference}
                    </span>
                    {active && <Check size={13} weight="bold" className="shrink-0 text-brand" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
