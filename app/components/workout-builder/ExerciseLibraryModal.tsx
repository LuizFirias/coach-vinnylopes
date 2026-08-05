"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MagnifyingGlass,
  X,
  Play,
  CaretDown,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { textIncludes } from "@/lib/utils/textNormalize";
import {
  CANONICAL_EQUIPMENTS,
  canonicalizeEquipment,
} from "@/lib/constants/equipment";

export interface LibraryExercise {
  id: string;
  nome: string;
  grupo_muscular: string;
  tipo_exercicio?: string;
  equipamento?: string;
  video_url?: string;
}

interface ExerciseLibraryModalProps {
  catalog: LibraryExercise[];
  existingIds?: Set<string>;
  pickMode?: boolean;
  pickExcludeId?: string | null;
  onClose: () => void;
  onAdd: (exercises: LibraryExercise[]) => void;
  onCreateNew?: () => void;
}

type FiltroValor = string | null;
type DropdownKey = "musculo" | "equipamento" | "tipo" | null;

function hasVideo(url?: string | null): boolean {
  return Boolean(url && url.trim());
}

type FiltroDropdownProps = {
  label: string;
  opcoes: string[];
  valor: FiltroValor;
  onSelect: (v: FiltroValor) => void;
  aberto: boolean;
  onToggle: () => void;
};

export function FiltroDropdown({
  label,
  opcoes,
  valor,
  onSelect,
  aberto,
  onToggle,
}: FiltroDropdownProps) {
  const ativo = valor !== null;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) {
        onToggle();
      }
    };

    // Adia o listener para não capturar o mesmo clique que abriu o menu
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", onPointerDown);
      document.addEventListener("touchstart", onPointerDown);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [aberto, onToggle]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        style={{ touchAction: "manipulation" }}
        aria-expanded={aberto}
        aria-haspopup="listbox"
        className={cn(
          "h-[34px] px-2.5 rounded-lg text-xs flex items-center gap-1 whitespace-nowrap border transition-colors cursor-pointer",
          ativo
            ? "border-brand/50 bg-brand/12 text-brand font-semibold"
            : "border-border-subtle bg-transparent text-text-tertiary font-medium hover:border-brand/30 hover:text-text-secondary",
        )}
      >
        <span className="max-w-[7rem] truncate">{ativo ? valor : label}</span>
        {ativo ? <X size={11} className="text-brand shrink-0" /> : <CaretDown size={11} className="shrink-0" />}
      </button>

      {aberto && (
        <div
          role="listbox"
          className="absolute top-[calc(100%+6px)] right-0 z-[80] min-w-[180px] max-h-60 overflow-y-auto rounded-[10px] border border-brand/20 bg-surface-1 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
        >
          <button
            type="button"
            role="option"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(null);
              onToggle();
            }}
            className={cn(
              "w-full px-3.5 py-2 text-left text-xs border-0 border-b border-border-divider/40 cursor-pointer",
              valor === null
                ? "text-brand font-semibold bg-transparent"
                : "text-text-tertiary font-normal bg-transparent hover:bg-brand/5",
            )}
          >
            Todos
          </button>
          {opcoes.length === 0 ? (
            <p className="px-3.5 py-2 text-[11px] text-text-disabled">Sem opções</p>
          ) : (
            opcoes.map((op) => (
              <button
                key={op}
                type="button"
                role="option"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(op);
                  onToggle();
                }}
                className={cn(
                  "w-full px-3.5 py-2 text-left text-xs border-0 cursor-pointer",
                  valor === op
                    ? "text-brand font-semibold bg-brand/10"
                    : "text-text-primary font-normal bg-transparent hover:bg-brand/5",
                )}
              >
                {op}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function FiltroChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand/12 border border-brand/25 text-[11px] text-brand font-medium">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="p-0 border-0 bg-transparent text-brand leading-none cursor-pointer"
        aria-label={`Remover filtro ${label}`}
      >
        <X size={10} />
      </button>
    </span>
  );
}

export function ExerciseLibraryModal({
  catalog,
  existingIds,
  pickMode = false,
  pickExcludeId = null,
  onClose,
  onAdd,
  onCreateNew,
}: ExerciseLibraryModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(existingIds ?? []),
  );
  const [filtroMusculo, setFiltroMusculo] = useState<FiltroValor>(null);
  const [filtroEquipamento, setFiltroEquipamento] = useState<FiltroValor>(null);
  const [filtroTipo, setFiltroTipo] = useState<FiltroValor>(null);
  const [dropdownAberto, setDropdownAberto] = useState<DropdownKey>(null);

  // Mantém pré-seleção se existingIds chegar após mount
  useEffect(() => {
    if (!existingIds || existingIds.size === 0) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      existingIds.forEach((id) => next.add(id));
      return next;
    });
  }, [existingIds]);

  const opcoesMusculo = useMemo(
    () =>
      [...new Set(catalog.map((ex) => ex.grupo_muscular).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [catalog],
  );

  const opcoesTipo = useMemo(
    () =>
      [
        ...new Set(
          catalog
            .map((ex) => ex.tipo_exercicio)
            .filter((v): v is string => Boolean(v)),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
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
        const matchTipo = !filtroTipo || ex.tipo_exercicio === filtroTipo;

        const matchEquipamento =
          !filtroEquipamento ||
          canonicalizeEquipment(ex.equipamento) === filtroEquipamento;

        return matchSearch && matchMusculo && matchTipo && matchEquipamento;
      }),
    [catalog, searchTerm, filtroMusculo, filtroEquipamento, filtroTipo],
  );

  const temFiltroAtivo = Boolean(filtroMusculo || filtroEquipamento || filtroTipo);

  const limparFiltros = () => {
    setFiltroMusculo(null);
    setFiltroEquipamento(null);
    setFiltroTipo(null);
    setDropdownAberto(null);
  };

  const toggle = (id: string) => {
    if (pickMode) {
      if (pickExcludeId && id === pickExcludeId) return;
      const ex = catalog.find((e) => e.id === id);
      if (ex) onAdd([ex]);
      return;
    }
    // Já na ficha: permanece selecionado (sem duplicar / sem remover por aqui)
    if (existingIds?.has(id)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const newSelectedCount = [...selectedIds].filter((id) => !existingIds?.has(id)).length;

  const handleConfirm = () => {
    if (newSelectedCount === 0) {
      onClose();
      return;
    }
    // Só envia exercícios novos — os já na ficha ficam de fora
    const selected = catalog.filter(
      (ex) => selectedIds.has(ex.id) && !existingIds?.has(ex.id),
    );
    onAdd(selected);
  };

  const toggleDropdown = (key: Exclude<DropdownKey, null>) => {
    setDropdownAberto((prev) => (prev === key ? null : key));
  };

  return (
    <div className={cn(
      "fixed inset-0 z-[100] flex items-center justify-center px-4 backdrop-blur-sm",
      pickMode ? "bg-black/75" : "bg-surface-0/80",
    )}>
      <div
        className={cn(
          "bg-surface-1 shadow-2xl w-full max-w-xl rounded-2xl flex flex-col max-h-[80vh] overflow-hidden",
          pickMode ? "ring-2 ring-brand border-0" : "border-0",
        )}
      >
        <div className="p-4 border-b border-border-divider/40 flex items-center justify-between shrink-0 rounded-t-2xl">
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              {pickMode ? "Exercício B do Bi-Set" : "Biblioteca"}
            </h3>
            <p className="text-[10px] text-text-tertiary">
              {pickMode
                ? "Toque em um exercício para completar o par"
                : "Selecione exercícios para adicionar"}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {onCreateNew && (
              <button
                type="button"
                onClick={onCreateNew}
                className={cn(
                  "btn-primary inline-flex items-center justify-center rounded-md font-semibold w-auto shadow-none",
                  "!min-h-0 !h-7 !px-2.5 !py-0 !text-[11px] !leading-none",
                  "max-sm:!h-6 max-sm:!px-2 max-sm:!text-[10px]",
                )}
              >
                + Novo
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 max-sm:w-6 max-sm:h-6 bg-surface-3 rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary"
            >
              <X size={14} className="max-sm:w-3 max-sm:h-3" />
            </button>
          </div>
        </div>

        <div className="relative z-30 px-4 py-3 flex flex-col gap-2 shrink-0 overflow-visible">
          {/* Search — always full width */}
          <div className="relative w-full">
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
              autoFocus
              className="filter-control filter-control-search filter-control-compact w-full"
            />
          </div>

          {/* Filters — uniform row below search */}
          <div className="flex items-center gap-2 flex-wrap">
            <FiltroDropdown
              label="Músculo"
              opcoes={opcoesMusculo}
              valor={filtroMusculo}
              onSelect={setFiltroMusculo}
              aberto={dropdownAberto === "musculo"}
              onToggle={() => toggleDropdown("musculo")}
            />
            <FiltroDropdown
              label="Equipamento"
              opcoes={opcoesEquipamento}
              valor={filtroEquipamento}
              onSelect={setFiltroEquipamento}
              aberto={dropdownAberto === "equipamento"}
              onToggle={() => toggleDropdown("equipamento")}
            />
            <FiltroDropdown
              label="Tipo"
              opcoes={opcoesTipo}
              valor={filtroTipo}
              onSelect={setFiltroTipo}
              aberto={dropdownAberto === "tipo"}
              onToggle={() => toggleDropdown("tipo")}
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
              {filtroTipo && (
                <FiltroChip label={filtroTipo} onRemove={() => setFiltroTipo(null)} />
              )}
              <button
                type="button"
                onClick={limparFiltros}
                className="text-[11px] text-text-disabled bg-transparent border-0 cursor-pointer px-1 py-0.5 hover:text-text-tertiary"
              >
                Limpar filtros
              </button>
            </div>
          )}

          {(searchTerm || temFiltroAtivo) && (
            <p className="text-[11px] text-text-disabled">
              {filtered.length} exercício{filtered.length !== 1 ? "s" : ""} encontrado
              {filtered.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 space-y-2 rounded-b-none">
          {filtered.map((ex) => {
            const isSelected = !pickMode && selectedIds.has(ex.id);
            const alreadyIn = !pickMode && existingIds?.has(ex.id);
            const blocked = pickMode && pickExcludeId === ex.id;
            const showPlayer = hasVideo(ex.video_url);

            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => !blocked && toggle(ex.id)}
                disabled={blocked}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border-0 shadow-sm transition-colors text-left",
                  blocked
                    ? "bg-surface-2 opacity-40 cursor-not-allowed"
                    : isSelected
                      ? "bg-brand/10 ring-1 ring-brand/30"
                      : "bg-surface-1 hover:bg-brand/5",
                  alreadyIn && "cursor-default",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-text-primary truncate">
                    {ex.nome}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-text-tertiary mt-0.5 truncate">
                    {ex.grupo_muscular}
                    {alreadyIn ? " · na ficha" : ""}
                    {blocked ? " · exercício A" : ""}
                  </p>
                </div>

                {showPlayer && (
                  <span
                    aria-hidden
                    title="Possui demonstração em vídeo"
                    className="w-8 h-8 shrink-0 rounded-full text-brand flex items-center justify-center pointer-events-none select-none"
                  >
                    <Play size={14} weight="fill" />
                  </span>
                )}

                {isSelected && (
                  <span className="w-5 h-5 shrink-0 rounded-full bg-brand text-[10px] text-text-on-brand flex items-center justify-center font-bold">
                    ✓
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

        <div className="p-4 border-t border-border-divider/40 flex justify-end gap-2 shrink-0 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-surface-3 text-text-secondary"
          >
            {pickMode ? "Cancelar" : "Cancelar"}
          </button>
          {!pickMode && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={newSelectedCount === 0}
              className="btn-primary px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-40"
            >
              Adicionar ({newSelectedCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
