"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass, X, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { textIncludes } from "@/lib/utils/textNormalize";

export interface LibraryExercise {
  id: string;
  nome: string;
  grupo_muscular: string;
  tipo_exercicio?: string;
  video_url?: string;
}

interface ExerciseLibraryModalProps {
  catalog: LibraryExercise[];
  existingIds?: Set<string>;
  onClose: () => void;
  onAdd: (exercises: LibraryExercise[]) => void;
  onCreateNew?: () => void;
}

export function ExerciseLibraryModal({
  catalog,
  existingIds,
  onClose,
  onAdd,
  onCreateNew,
}: ExerciseLibraryModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () =>
      catalog.filter(
        (ex) =>
          textIncludes(ex.nome, searchTerm) ||
          textIncludes(ex.grupo_muscular, searchTerm),
      ),
    [catalog, searchTerm],
  );

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (selectedIds.size === 0) {
      onClose();
      return;
    }
    const selected = catalog.filter((ex) => selectedIds.has(ex.id));
    onAdd(selected);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-[#0d0d0d]/80 backdrop-blur-sm">
      <div className="bg-[#141414] border border-[#222222] shadow-2xl w-full max-w-xl rounded-xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-[#222222] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Biblioteca</h3>
            <p className="text-[10px] text-[#7a8aab]">
              Selecione exercícios para adicionar
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onCreateNew && (
              <button
                type="button"
                onClick={onCreateNew}
                className="px-2.5 h-8 bg-[#2b7fff] text-white rounded-lg text-xs font-semibold"
              >
                + Novo
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 bg-[#1e1e1e] rounded-lg flex items-center justify-center text-[#7a8aab]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8aab] w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Filtrar por nome ou grupo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-[#1e1e1e] border border-[#282828] rounded-lg text-xs text-white placeholder:text-[#555555] focus:outline-none focus:border-[#2b7fff]/40"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
          {filtered.map((ex) => {
            const isSelected = selectedIds.has(ex.id);
            const alreadyIn = existingIds?.has(ex.id);
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => toggle(ex.id)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg border text-left",
                  isSelected
                    ? "border-[#2b7fff] bg-[#2b7fff]/5"
                    : "border-[#222222] bg-[#1e1e1e]",
                )}
              >
                <div>
                  <p
                    className={cn(
                      "text-xs font-bold",
                      isSelected ? "text-[#2b7fff]" : "text-white",
                    )}
                  >
                    {ex.nome}
                  </p>
                  <p className="text-[9px] uppercase text-[#7a8aab]">
                    {ex.grupo_muscular}
                    {alreadyIn ? " · na ficha" : ""}
                  </p>
                </div>
                {isSelected ? (
                  <span className="w-4 h-4 rounded-full bg-[#2b7fff] text-[9px] text-white flex items-center justify-center">
                    ✓
                  </span>
                ) : (
                  <CaretRight size={14} className="text-[#7a8aab]" />
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-[#555555] text-center py-8">
              Nenhum exercício encontrado
            </p>
          )}
        </div>

        <div className="p-4 border-t border-[#222222] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#1e1e1e] text-[#7a8aab]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 bg-[#2b7fff] disabled:opacity-40 text-white rounded-lg text-xs font-semibold"
          >
            Adicionar ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  );
}
