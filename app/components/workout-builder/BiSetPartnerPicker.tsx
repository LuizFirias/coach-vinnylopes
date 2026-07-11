"use client";

import { useState } from "react";
import { MagnifyingGlass, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { textIncludes } from "@/lib/utils/textNormalize";

interface CatalogExercise {
  id: string;
  nome: string;
  grupo_muscular: string;
}

interface BiSetPartnerPickerProps {
  catalog: CatalogExercise[];
  excludeIds?: string[];
  onSelect: (ex: CatalogExercise) => void;
}

export function BiSetPartnerPicker({ catalog, excludeIds = [], onSelect }: BiSetPartnerPickerProps) {
  const [search, setSearch] = useState("");
  const filtered = catalog
    .filter((ex) => !excludeIds.includes(ex.id))
    .filter(
      (ex) =>
        textIncludes(ex.nome, search) ||
        textIncludes(ex.grupo_muscular, search)
    )
    .slice(0, 6);

  return (
    <div className="mt-2 rounded-[10px] border border-dashed border-brand bg-[#0d0d0d] p-3.5">
      <p className="text-xs font-semibold text-text-primary mb-2.5">+ Selecionar exercício B</p>
      <div className="relative mb-2">
        <MagnifyingGlass
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar exercício..."
          className="w-full h-10 pl-9 pr-3 bg-[#1e1e1e] border border-[#282828] rounded-lg text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand/40"
        />
      </div>
      <div className="divide-y divide-[#1e1e1e]">
        {filtered.length === 0 ? (
          <p className="py-3 text-xs text-text-tertiary text-center">Nenhum exercício encontrado</p>
        ) : (
          filtered.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => onSelect(ex)}
              className={cn(
                "w-full min-h-11 flex items-center justify-between gap-2 py-2 text-left",
                "hover:bg-[#141414] transition-colors rounded-md px-1"
              )}
            >
              <div className="min-w-0">
                <p className="text-sm text-text-primary truncate">{ex.nome}</p>
                <p className="text-[11px] text-text-disabled uppercase">{ex.grupo_muscular}</p>
              </div>
              <CaretRight size={14} className="text-text-disabled shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
