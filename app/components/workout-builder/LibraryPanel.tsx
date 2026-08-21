"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass, Plus, Play, Barbell } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { textIncludes } from "@/lib/utils/textNormalize";
import {
  CANONICAL_EQUIPMENTS,
  canonicalizeEquipment,
} from "@/lib/constants/equipment";
import {
  FiltroDropdown,
  FiltroChip,
  type LibraryExercise,
} from "./ExerciseLibraryModal";

type Props = {
  catalog: LibraryExercise[];
  existingIds?: Set<string>;
  /** Em modo Bi-Set: destaca a biblioteca e só bloqueia o exercício A */
  pickMode?: boolean;
  pickExcludeId?: string | null;
  onAdd: (exercises: LibraryExercise[]) => void;
  onCreateNew?: () => void;
};

type DropdownKey = "musculo" | "equipamento" | null;

export function LibraryPanel({
  catalog,
  existingIds,
  pickMode = false,
  pickExcludeId = null,
  onAdd,
  onCreateNew,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroMusculo, setFiltroMusculo] = useState<string | null>(null);
  const [filtroEquipamento, setFiltroEquipamento] = useState<string | null>(null);
  const [dropdownAberto, setDropdownAberto] = useState<DropdownKey>(null);

  const opcoesMusculo = useMemo(
    () =>
      [...new Set(catalog.map((ex) => ex.grupo_muscular).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [catalog],
  );

  const opcoesEquipamento = useMemo(() => [...CANONICAL_EQUIPMENTS], []);

  const filtered = useMemo(
    () =>
      catalog.filter((ex) => {
        const matchSearch =
          !searchTerm ||
          textIncludes(ex.nome, searchTerm) ||
          textIncludes(ex.grupo_muscular, searchTerm);
        const matchMusculo = !filtroMusculo || ex.grupo_muscular === filtroMusculo;
        const matchEquipamento =
          !filtroEquipamento ||
          canonicalizeEquipment(ex.equipamento) === filtroEquipamento;
        return matchSearch && matchMusculo && matchEquipamento;
      }),
    [catalog, searchTerm, filtroMusculo, filtroEquipamento],
  );

  const temFiltroAtivo = Boolean(filtroMusculo || filtroEquipamento);

  const limparFiltros = () => {
    setFiltroMusculo(null);
    setFiltroEquipamento(null);
    setDropdownAberto(null);
  };

  const toggleDropdown = (key: Exclude<DropdownKey, null>) => {
    setDropdownAberto((prev) => (prev === key ? null : key));
  };

  const handleClickExercise = (ex: LibraryExercise) => {
    if (pickMode) {
      if (pickExcludeId && ex.id === pickExcludeId) return;
      onAdd([ex]);
      return;
    }
    if (existingIds?.has(ex.id)) return;
    onAdd([ex]);
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-surface-1 transition-shadow",
        pickMode && "ring-2 ring-brand shadow-[0_0_48px_rgba(117, 27, 180,0.35)]",
      )}
    >
      <div className="relative z-30 shrink-0 px-4 pt-4 pb-3 flex flex-col gap-2 overflow-visible">
        {pickMode && (
          <div className="rounded-lg bg-brand/15 px-3 py-2.5">
            <p className="text-xs font-semibold text-brand">
              Selecione o exercício B do Bi-Set
            </p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Toque em um exercício da biblioteca
            </p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary">
            {pickMode ? "Exercício B" : "Biblioteca"}
          </h3>
          {onCreateNew && (
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
            >
              <Plus size={11} weight="bold" /> Novo exercício
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <div className="relative flex-1 min-w-[140px]">
            <MagnifyingGlass
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--filter-placeholder)]"
            />
            <input
              type="search"
              placeholder="Buscar exercício..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar exercícios"
              className="filter-control filter-control-search filter-control-compact w-full"
            />
          </div>

          <FiltroDropdown
            label="Músculo"
            opcoes={opcoesMusculo}
            valor={filtroMusculo}
            onSelect={setFiltroMusculo}
            aberto={dropdownAberto === "musculo"}
            onToggle={() => toggleDropdown("musculo")}
            align="left"
          />
          <FiltroDropdown
            label="Equipamento"
            opcoes={opcoesEquipamento}
            valor={filtroEquipamento}
            onSelect={setFiltroEquipamento}
            aberto={dropdownAberto === "equipamento"}
            onToggle={() => toggleDropdown("equipamento")}
            align="right"
          />
        </div>

        {temFiltroAtivo && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {filtroMusculo && (
              <FiltroChip label={filtroMusculo} onRemove={() => setFiltroMusculo(null)} />
            )}
            {filtroEquipamento && (
              <FiltroChip
                label={filtroEquipamento}
                onRemove={() => setFiltroEquipamento(null)}
              />
            )}
            <button
              type="button"
              onClick={limparFiltros}
              className="text-[11px] text-text-disabled bg-transparent border-0 cursor-pointer px-1 hover:text-text-tertiary"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      <p className="shrink-0 px-4 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
        {searchTerm || temFiltroAtivo
          ? `${filtered.length} exercício${filtered.length !== 1 ? "s" : ""}`
          : "Todos os exercícios"}
      </p>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 pt-2 pb-3 space-y-1">
        {filtered.map((ex) => {
          const alreadyIn = !pickMode && existingIds?.has(ex.id);
          const blocked = pickMode && pickExcludeId === ex.id;
          const hasVid = Boolean(ex.video_url?.trim());

          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => handleClickExercise(ex)}
              disabled={alreadyIn || blocked}
              className={cn(
                "w-full flex items-center gap-2.5 px-1.5 py-2 rounded-lg text-left transition-colors",
                alreadyIn || blocked
                  ? "opacity-40 cursor-not-allowed"
                  : pickMode
                    ? "hover:bg-brand/15"
                    : "hover:bg-brand/5",
              )}
            >
              <span
                className={cn(
                  "w-6 h-6 shrink-0 rounded-full flex items-center justify-center",
                  alreadyIn
                    ? "bg-surface-3 text-text-disabled"
                    : "bg-brand text-text-on-brand",
                )}
              >
                <Plus size={12} weight="bold" />
              </span>

              <span className="relative w-9 h-9 shrink-0 flex items-center justify-center overflow-hidden rounded-lg">
                {ex.imagem_url || ex.gif_url ? (
                  <img
                    src={ex.imagem_url || ex.gif_url}
                    alt=""
                    aria-hidden
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Barbell size={16} className="text-text-disabled" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-text-primary truncate">
                  {ex.nome}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-text-tertiary mt-0.5 truncate">
                  {ex.grupo_muscular}
                  {alreadyIn ? " · na ficha" : ""}
                  {blocked ? " · exercício A" : ""}
                </p>
              </div>

              {hasVid && (
                <span
                  aria-hidden
                  title="Possui demonstração em vídeo"
                  className="w-6 h-6 shrink-0 flex items-center justify-center ml-1 text-brand"
                >
                  <Play size={14} weight="fill" />
                </span>
              )}
            </button>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-xs text-text-tertiary text-center py-8">
            Nenhum exercício encontrado
          </p>
        )}
      </div>
    </div>
  );
}
