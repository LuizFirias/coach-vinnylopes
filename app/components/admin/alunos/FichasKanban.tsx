"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  ArrowsDownUp,
  Copy,
  DotsSixVertical,
  FloppyDisk,
  FolderSimple,
  Lightning,
  List,
  Clock,
  PencilSimple,
  Trash,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/app/components/AuthProvider";
import { concluirPasso } from "@/lib/onboarding/concluirPasso";
import { cn } from "@/lib/utils/cn";
import {
  isBiSetFichaItem,
  parseFichaItems,
  serializeFichaItems,
} from "@/lib/utils/biset";
import {
  ExerciseLibraryModal,
  type LibraryExercise,
} from "@/app/components/workout-builder/ExerciseLibraryModal";
import { TechniqueCell } from "@/app/components/workout-builder/TechniqueCell";
import type { ExercicioFicha } from "@/app/components/workout-builder/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FichaKanbanItem {
  id: string;
  nome_rotina: string;
  configuracao: { exercicios?: unknown[] } | null;
  ativo: boolean;
  criado_em: string;
}

/** One series row in quick-build / inline-edit */
interface QuickSerie {
  reps: string;
  peso: number | null;
  tecnica: string;
  tecnica_extra: string;
}

/** Exercise in quick-build / inline-edit mode */
interface QuickExercise {
  id: string;
  nome: string;
  video_url?: string;
  series: QuickSerie[];
  descanso: number; // seconds
}

const EMPTY_SERIE = (): QuickSerie => ({
  reps: "12",
  peso: null,
  tecnica: "",
  tecnica_extra: "",
});

interface PendingFicha {
  tempId: string;
  nome: string;
  exercicios: QuickExercise[];
}

interface FichasKanbanProps {
  fichas: FichaKanbanItem[];
  alunoId: string;
  currentFichaId?: string | null;
  onReorderFichas: (orderedIds: string[]) => void;
  onUpdateFichaExercicios: (fichaId: string, exercicios: unknown[]) => Promise<void>;
  onDeleteFicha: (fichaId: string) => void;
  onCloneFicha: (ficha: FichaKanbanItem) => void;
  onDuplicateFicha: (ficha: FichaKanbanItem) => void;
  onArchiveFicha: (fichaId: string) => void;
  onUnarchiveFicha: (fichaId: string) => void;
  /** Called after a quick-build or edit save so the parent can refresh */
  onFichaSaved?: () => void;
  /** Opens external exercise-add modal for a saved ficha */
  onAddExercise: (fichaId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function exerciseTitle(ex: unknown): string {
  if (isBiSetFichaItem(ex as never)) {
    const item = ex as { exercicioA?: { nome?: string }; exercicioB?: { nome?: string } };
    return `${item.exercicioA?.nome ?? "A"} + ${item.exercicioB?.nome ?? "…"}`;
  }
  return (ex as { nome?: string })?.nome ?? "Exercício";
}

function secondsToMMSS(s: number): string {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function mmssToSeconds(mmss: string): number {
  if (!mmss) return 90;
  const parts = mmss.split(":");
  if (parts.length === 2)
    return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
  return parseInt(mmss) || 90;
}

function quickExToFicha(ex: QuickExercise): ExercicioFicha {
  const normalized = normalizeQuickEx(ex);
  return {
    instanceId: crypto.randomUUID(),
    id: normalized.id,
    nome: normalized.nome,
    tipo_exercicio: "Peso & Repetições",
    descanso: secondsToMMSS(normalized.descanso),
    video_url: normalized.video_url ?? "",
    observacoes: "",
    series: normalized.series.map((s, i) => ({
      ordem: i + 1,
      reps_sugerido: s.reps || "12",
      tecnica: s.tecnica || "",
      tecnica_extra: s.tecnica_extra || "",
      peso_sugerido: s.peso,
    })),
  };
}

function parsedToQuick(item: unknown): QuickExercise | null {
  if (isBiSetFichaItem(item as never)) return null;
  const ex = item as ExercicioFicha;
  if (!ex?.id) return null;
  return {
    id: ex.id,
    nome: ex.nome ?? "",
    video_url: ex.video_url,
    series: (ex.series ?? []).map((s) => ({
      reps: String(s.reps_sugerido ?? "12"),
      peso: s.peso_sugerido ?? null,
      tecnica: s.tecnica ?? "",
      tecnica_extra: s.tecnica_extra ?? "",
    })),
    descanso: mmssToSeconds(ex.descanso ?? "01:30"),
  };
}

function libToQuick(lib: LibraryExercise): QuickExercise {
  return {
    id: lib.id,
    nome: lib.nome,
    video_url: lib.video_url,
    series: [EMPTY_SERIE(), EMPTY_SERIE(), EMPTY_SERIE()],
    descanso: 90,
  };
}

/** Normaliza exercício (inclui shape antigo com `reps: string[]` pós-HMR) */
function normalizeQuickEx(ex: QuickExercise & { reps?: string[] }): QuickExercise {
  if (Array.isArray(ex.series)) {
    return {
      ...ex,
      series: ex.series.map((s) => ({
        reps: s?.reps ?? "12",
        peso: s?.peso ?? null,
        tecnica: s?.tecnica ?? "",
        tecnica_extra: s?.tecnica_extra ?? "",
      })),
    };
  }
  if (Array.isArray(ex.reps) && ex.reps.length > 0) {
    return {
      id: ex.id,
      nome: ex.nome,
      video_url: ex.video_url,
      descanso: ex.descanso ?? 90,
      series: ex.reps.map((r) => ({
        reps: r || "12",
        peso: null,
        tecnica: "",
        tecnica_extra: "",
      })),
    };
  }
  return {
    id: ex.id,
    nome: ex.nome,
    video_url: ex.video_url,
    descanso: ex.descanso ?? 90,
    series: [EMPTY_SERIE(), EMPTY_SERIE(), EMPTY_SERIE()],
  };
}

const SERIES_GRID =
  "grid grid-cols-[0.75rem_minmax(1.4rem,1fr)_minmax(1.4rem,1fr)_1.6rem_1.6rem_0.75rem] gap-x-1 items-center";

// ─── Sub-component: inline exercise editor row ────────────────────────────────

interface QuickExItemProps {
  ex: QuickExercise;
  index: number;
  onRemove: () => void;
  onChange: (updated: QuickExercise) => void;
}

function QuickExItem({ ex: rawEx, index, onRemove, onChange }: QuickExItemProps) {
  const ex = normalizeQuickEx(rawEx);

  const updateSerie = (si: number, patch: Partial<QuickSerie>) =>
    onChange({
      ...ex,
      series: ex.series.map((s, j) => (j === si ? { ...s, ...patch } : s)),
    });

  return (
    <div className="py-2.5 border-b border-border-divider last:border-0">
      {/* Name + descanso + remove */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[11px] font-semibold text-text-primary leading-snug flex-1 min-w-0 truncate">
          {index + 1}. {ex.nome}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <Clock size={11} weight="fill" className="text-text-tertiary" />
          <input
            type="number"
            min={0}
            max={600}
            value={ex.descanso}
            onChange={(e) => onChange({ ...ex, descanso: Math.max(0, Number(e.target.value)) })}
            className="serie-metric-input w-8 text-center tabular-nums text-[10px]!"
            aria-label="Descanso em segundos"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 w-4 h-4 flex items-center justify-center text-text-tertiary hover:text-danger transition-colors"
        >
          <X size={10} />
        </button>
      </div>

      {/* Column headers */}
      <div className={cn(SERIES_GRID, "mb-0.5")}>
        <span />
        <span className="text-[10px] font-medium text-brand text-center">reps</span>
        <span className="text-[10px] font-medium text-brand text-center">peso</span>
        <span className="text-[10px] font-medium text-brand text-center">t1</span>
        <span className="text-[10px] font-medium text-brand text-center">t2</span>
        <span />
      </div>

      {/* Series rows */}
      <div className="flex flex-col gap-0.5 mb-1">
        {ex.series.map((s, si) => (
          <div key={si} className={SERIES_GRID}>
            <span className="text-[10px] text-text-tertiary text-right tabular-nums">
              {si + 1}
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={s.reps}
              onChange={(e) => updateSerie(si, { reps: e.target.value })}
              placeholder="12"
              className="serie-metric-input w-full text-center tabular-nums"
              aria-label={`Reps série ${si + 1}`}
            />
            <input
              type="number"
              step="0.5"
              inputMode="decimal"
              value={s.peso != null && s.peso > 0 ? String(s.peso) : ""}
              onChange={(e) => {
                const raw = e.target.value;
                updateSerie(si, { peso: raw === "" ? null : Number(raw) });
              }}
              placeholder="—"
              className="serie-metric-input w-full text-center tabular-nums"
              aria-label={`Peso série ${si + 1}`}
            />
            <TechniqueCell
              type="technique"
              value={s.tecnica}
              onChange={(v) => updateSerie(si, { tecnica: v })}
              className="h-6! text-[10px]! px-0"
            />
            <TechniqueCell
              type="extra"
              value={s.tecnica_extra}
              onChange={(v) => updateSerie(si, { tecnica_extra: v })}
              className="h-6! text-[10px]! px-0"
            />
            {ex.series.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  onChange({ ...ex, series: ex.series.filter((_, j) => j !== si) })
                }
                className="w-3.5 h-3.5 flex items-center justify-center text-text-tertiary hover:text-danger transition-colors justify-self-center"
                aria-label="Remover série"
              >
                <X size={8} />
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ ...ex, series: [...ex.series, EMPTY_SERIE()] })}
          className="text-[10px] text-brand hover:text-brand-hover mt-0.5 ml-4 text-left bg-transparent border-0 p-0"
        >
          + série
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FichasKanban({
  fichas,
  alunoId,
  currentFichaId = null,
  onReorderFichas,
  onUpdateFichaExercicios: _onUpdateFichaExercicios,
  onDeleteFicha,
  onCloneFicha,
  onDuplicateFicha,
  onArchiveFicha,
  onUnarchiveFicha,
  onFichaSaved,
  onAddExercise,
}: FichasKanbanProps) {
  const { user } = useAuth();

  // ── Kanban column drag ────────────────────────────────────────────────────
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [overColId, setOverColId] = useState<string | null>(null);

  // ── Pending quick-build fichas ────────────────────────────────────────────
  const [pendingFichas, setPendingFichas] = useState<PendingFicha[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Exercise catalog (lazy) ───────────────────────────────────────────────
  const [catalog, setCatalog] = useState<LibraryExercise[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  // addExTarget: where to insert selected exercises
  const [addExTarget, setAddExTarget] = useState<
    { type: "pending"; id: string } | { type: "editing" } | null
  >(null);

  // Auto-focus new name input
  const latestInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { latestInputRef.current?.focus(); }, [pendingFichas.length]);

  // ── Action dropdown (per saved ficha) ─────────────────────────────────────
  const [menuFichaId, setMenuFichaId] = useState<string | null>(null);
  useEffect(() => {
    if (!menuFichaId) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest("[data-ficha-menu]"))
        setMenuFichaId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuFichaId]);

  // ── Inline edit mode ──────────────────────────────────────────────────────
  const [editingFichaId, setEditingFichaId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<{
    nome: string;
    exercicios: QuickExercise[];
  } | null>(null);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // ── Exercise reorder modal ────────────────────────────────────────────────
  const [reorderFichaId, setReorderFichaId] = useState<string | null>(null);
  const [reorderItems, setReorderItems] = useState<{ key: string; data: unknown }[]>([]);
  const [reorderDragIdx, setReorderDragIdx] = useState<number | null>(null);
  const [savingReorder, setSavingReorder] = useState(false);
  const reorderDragIdxRef = useRef<number | null>(null);
  const reorderItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reorderListRef = useRef<HTMLDivElement | null>(null);

  // ── Catalog loader ────────────────────────────────────────────────────────
  const loadCatalog = useCallback(async () => {
    if (catalog.length > 0 || catalogLoading) return;
    setCatalogLoading(true);
    try {
      const { data } = await supabaseClient
        .from("exercicios_biblioteca")
        .select("id, nome, grupo_muscular, tipo_exercicio, equipamento, video_url")
        .order("nome", { ascending: true });
      setCatalog((data as LibraryExercise[]) ?? []);
    } finally {
      setCatalogLoading(false);
    }
  }, [catalog.length, catalogLoading]);

  // ── Pending handlers ──────────────────────────────────────────────────────
  const addPendingFicha = useCallback(async () => {
    await loadCatalog();
    setPendingFichas((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), nome: "", exercicios: [] },
    ]);
  }, [loadCatalog]);

  const removePendingFicha = useCallback(
    (tempId: string) => setPendingFichas((prev) => prev.filter((f) => f.tempId !== tempId)),
    [],
  );

  const savePendingFicha = useCallback(
    async (pending: PendingFicha) => {
      if (!pending.nome.trim() || !user?.id) return;
      setSavingId(pending.tempId);
      setSaveError(null);
      try {
        const fichaExs = pending.exercicios.map(quickExToFicha);
        const { error } = await supabaseClient.from("fichas_treino").insert({
          aluno_id: alunoId,
          coach_id: user.id,
          nome_rotina: pending.nome.trim(),
          configuracao: { exercicios: serializeFichaItems(fichaExs) },
          ativo: true,
        });
        if (error) throw error;
        await concluirPasso(user.id, "montar-ficha");
        setPendingFichas((prev) => prev.filter((f) => f.tempId !== pending.tempId));
        onFichaSaved?.();
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : "Erro ao salvar");
      } finally {
        setSavingId(null);
      }
    },
    [alunoId, user?.id, onFichaSaved],
  );

  const updatePendingEx = useCallback(
    (tempId: string, exIdx: number, updated: QuickExercise) =>
      setPendingFichas((prev) =>
        prev.map((f) =>
          f.tempId === tempId
            ? { ...f, exercicios: f.exercicios.map((e, i) => (i === exIdx ? updated : e)) }
            : f,
        ),
      ),
    [],
  );

  const removePendingEx = useCallback(
    (tempId: string, exIdx: number) =>
      setPendingFichas((prev) =>
        prev.map((f) =>
          f.tempId === tempId
            ? { ...f, exercicios: f.exercicios.filter((_, i) => i !== exIdx) }
            : f,
        ),
      ),
    [],
  );

  // ── Column reorder ────────────────────────────────────────────────────────
  const handleColumnReorder = useCallback(
    (targetId: string) => {
      if (!dragColId || dragColId === targetId) { setDragColId(null); return; }
      const ids = fichas.map((f) => f.id);
      const from = ids.indexOf(dragColId);
      const to = ids.indexOf(targetId);
      if (from < 0 || to < 0) { setDragColId(null); return; }
      const next = [...ids];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onReorderFichas(next);
      setDragColId(null);
    },
    [dragColId, fichas, onReorderFichas],
  );

  // ── Edit mode handlers ────────────────────────────────────────────────────
  const startEditing = useCallback(
    async (ficha: FichaKanbanItem) => {
      await loadCatalog();
      const items = parseFichaItems(ficha.configuracao?.exercicios ?? []);
      const quickExs = items.map(parsedToQuick).filter(Boolean) as QuickExercise[];
      setEditingFichaId(ficha.id);
      setEditingData({ nome: ficha.nome_rotina ?? "", exercicios: quickExs });
      setEditError(null);
    },
    [loadCatalog],
  );

  const cancelEdit = useCallback(() => {
    setEditingFichaId(null);
    setEditingData(null);
    setEditError(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingFichaId || !editingData) return;
    setSavingEditId(editingFichaId);
    setEditError(null);
    try {
      const fichaExs = editingData.exercicios.map(quickExToFicha);
      const { error } = await supabaseClient
        .from("fichas_treino")
        .update({
          nome_rotina: editingData.nome.trim() || undefined,
          configuracao: { exercicios: serializeFichaItems(fichaExs) },
        })
        .eq("id", editingFichaId);
      if (error) throw error;
      setEditingFichaId(null);
      setEditingData(null);
      onFichaSaved?.();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSavingEditId(null);
    }
  }, [editingFichaId, editingData, onFichaSaved]);

  const updateEditingEx = useCallback(
    (exIdx: number, updated: QuickExercise) =>
      setEditingData((prev) =>
        prev ? { ...prev, exercicios: prev.exercicios.map((e, i) => (i === exIdx ? updated : e)) } : null,
      ),
    [],
  );

  const removeEditingEx = useCallback(
    (exIdx: number) =>
      setEditingData((prev) =>
        prev ? { ...prev, exercicios: prev.exercicios.filter((_, i) => i !== exIdx) } : null,
      ),
    [],
  );

  // ── Reorder exercises handlers (pointer-based — works on mobile + desktop) ─
  const startReorder = useCallback((ficha: FichaKanbanItem) => {
    const raw = [...(ficha.configuracao?.exercicios ?? [])];
    setReorderFichaId(ficha.id);
    setReorderItems(raw.map((data) => ({ key: crypto.randomUUID(), data })));
    setReorderDragIdx(null);
    reorderDragIdxRef.current = null;
    reorderItemRefs.current = [];
  }, []);

  const moveReorderItem = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    setReorderItems((prev) => {
      if (fromIdx >= prev.length || toIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    reorderDragIdxRef.current = toIdx;
    setReorderDragIdx(toIdx);
  }, []);

  const findReorderTargetIdx = useCallback((clientY: number): number | null => {
    const refs = reorderItemRefs.current;
    for (let i = 0; i < refs.length; i++) {
      const el = refs[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) return i;
    }
    const first = refs[0]?.getBoundingClientRect();
    const last = refs[refs.length - 1]?.getBoundingClientRect();
    if (first && clientY < first.top) return 0;
    if (last && clientY > last.bottom) return refs.length - 1;
    return null;
  }, []);

  const onReorderPointerDown = useCallback((idx: number, e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    reorderDragIdxRef.current = idx;
    setReorderDragIdx(idx);
  }, []);

  const onReorderPointerMove = useCallback((e: ReactPointerEvent) => {
    const from = reorderDragIdxRef.current;
    if (from === null) return;
    e.preventDefault();
    const target = findReorderTargetIdx(e.clientY);
    if (target !== null && target !== from) {
      moveReorderItem(from, target);
    }
  }, [findReorderTargetIdx, moveReorderItem]);

  const onReorderPointerUp = useCallback((e: ReactPointerEvent) => {
    if (reorderDragIdxRef.current === null) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
    reorderDragIdxRef.current = null;
    setReorderDragIdx(null);
  }, []);

  const saveReorder = useCallback(async () => {
    if (!reorderFichaId) return;
    setSavingReorder(true);
    try {
      const exercicios = reorderItems.map((r) => r.data);
      const { error } = await supabaseClient
        .from("fichas_treino")
        .update({ configuracao: { exercicios } })
        .eq("id", reorderFichaId);
      if (error) throw error;
      setReorderFichaId(null);
      setReorderItems([]);
      onFichaSaved?.();
    } catch {
      // silent — user can retry
    } finally {
      setSavingReorder(false);
    }
  }, [reorderFichaId, reorderItems, onFichaSaved]);

  // ── Exercise library ──────────────────────────────────────────────────────
  const openAddEx = useCallback(
    async (target: typeof addExTarget) => {
      await loadCatalog();
      setAddExTarget(target);
    },
    [loadCatalog],
  );

  const handleAddExercises = useCallback(
    (selected: LibraryExercise[]) => {
      if (!addExTarget) return;
      const newExs = selected.map(libToQuick);
      if (addExTarget.type === "pending") {
        const tid = addExTarget.id;
        setPendingFichas((prev) =>
          prev.map((f) =>
            f.tempId === tid
              ? {
                  ...f,
                  exercicios: [
                    ...f.exercicios,
                    ...newExs.filter((n) => !f.exercicios.some((e) => e.id === n.id)),
                  ],
                }
              : f,
          ),
        );
      } else {
        setEditingData((prev) =>
          prev
            ? {
                ...prev,
                exercicios: [
                  ...prev.exercicios,
                  ...newExs.filter((n) => !prev.exercicios.some((e) => e.id === n.id)),
                ],
              }
            : null,
        );
      }
      setAddExTarget(null);
    },
    [addExTarget],
  );

  const isEditing = !!editingFichaId;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* ── Edit-mode backdrop ── */}
      {isEditing && (
        <div
          className="fixed inset-0 z-15 bg-black/45"
          onClick={cancelEdit}
        />
      )}

      {/* ── Unified card container ── */}
      <div className="flex overflow-x-auto items-start gap-3 pb-2 md:overflow-x-visible md:pb-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">

        {/* ── Saved fichas ── */}
        {fichas.map((ficha) => {
          const items = parseFichaItems(ficha.configuracao?.exercicios ?? []);
          const isOver = overColId === ficha.id && dragColId !== ficha.id;
          const isEditingThis = editingFichaId === ficha.id;

          // ─ Edit mode ────────────────────────────────────────────────────
          if (isEditingThis && editingData) {
            return (
              <div
                key={ficha.id}
                className="shrink-0 w-60 md:w-auto flex flex-col rounded-xl border border-brand bg-surface-1 shadow-elev-2 relative z-20"
              >
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-divider">
                  <div className="field-flat-input flex-1 min-w-0">
                    <input
                      type="text"
                      value={editingData.nome}
                      onChange={(e) =>
                        setEditingData((prev) => prev ? { ...prev, nome: e.target.value } : null)
                      }
                      placeholder="Nome do treino…"
                      className="w-full text-[13px] font-semibold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="shrink-0 w-7 h-7 rounded-md text-text-tertiary hover:text-danger hover:bg-surface-2 flex items-center justify-center transition-colors"
                    title="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Exercise editor */}
                <div className="px-3 overflow-y-auto max-h-72 md:max-h-80">
                  {editingData.exercicios.length === 0 ? (
                    <p className="text-[11px] text-text-tertiary text-center py-4">
                      Nenhum exercício
                    </p>
                  ) : (
                    editingData.exercicios.map((ex, i) => (
                      <QuickExItem
                        key={ex.id + i}
                        ex={ex}
                        index={i}
                        onRemove={() => removeEditingEx(i)}
                        onChange={(u) => updateEditingEx(i, u)}
                      />
                    ))
                  )}
                </div>

                {/* Add exercise link */}
                <button
                  type="button"
                  onClick={() => void openAddEx({ type: "editing" })}
                  disabled={catalogLoading}
                  className="mx-3 mt-1 text-left text-[11px] font-semibold text-brand hover:text-brand-hover border-0 bg-transparent py-1.5 transition-colors disabled:opacity-50"
                >
                  {catalogLoading ? "Carregando…" : "+ adicionar exercício"}
                </button>

                {editError && (
                  <p className="text-[10px] text-danger px-3 pb-1">{editError}</p>
                )}

                {/* Save footer */}
                <div className="px-3 py-2.5 border-t border-border-divider mt-1">
                  <button
                    type="button"
                    disabled={!editingData.nome.trim() || savingEditId === ficha.id}
                    onClick={() => void saveEdit()}
                    className="w-full h-8 rounded-lg bg-brand hover:bg-brand-hover text-text-on-brand text-[12px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    <FloppyDisk size={13} weight="bold" />
                    {savingEditId === ficha.id ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </div>
            );
          }

          // ─ Normal view ──────────────────────────────────────────────────
          const isArchived = !ficha.ativo;
          return (
            <div
              key={ficha.id}
              className={cn(
                "shrink-0 w-60 md:w-auto flex flex-col rounded-xl border bg-surface-1 transition-colors",
                isOver ? "border-brand/50 bg-brand/5" : "border-transparent",
                dragColId === ficha.id && "opacity-50",
                isEditing && "opacity-40 pointer-events-none",
                isArchived && "opacity-45",
              )}
              onDragOver={(e) => { e.preventDefault(); if (dragColId && !isArchived) setOverColId(ficha.id); }}
              onDragLeave={() => setOverColId((c) => (c === ficha.id ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragColId && !isArchived) handleColumnReorder(ficha.id);
                setOverColId(null);
              }}
            >
              {/* Header */}
              <div className={cn(
                "flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border-divider",
                isArchived && "pointer-events-auto",
              )}>
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {!isArchived && (
                    <button
                      type="button"
                      draggable
                      onDragStart={() => setDragColId(ficha.id)}
                      onDragEnd={() => { setDragColId(null); setOverColId(null); }}
                      className="shrink-0 p-0.5 cursor-grab active:cursor-grabbing text-text-tertiary hover:text-text-secondary touch-none"
                      aria-label="Reordenar treino"
                    >
                      <DotsSixVertical size={14} />
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-[13px] font-semibold text-text-primary truncate leading-tight">
                        {ficha.nome_rotina || "Sem nome"}
                      </h4>
                      {currentFichaId === ficha.id && ficha.ativo && (
                        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-success/15 text-success">
                          atual
                        </span>
                      )}
                      {isArchived && (
                        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface-2 text-text-tertiary">
                          arquivo
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-text-tertiary mt-0.5">
                      {items.length} exercício{items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                {/* Actions menu */}
                <div className="relative shrink-0" data-ficha-menu>
                  <button
                    type="button"
                    onClick={() =>
                      setMenuFichaId(menuFichaId === ficha.id ? null : ficha.id)
                    }
                    className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                      menuFichaId === ficha.id
                        ? "bg-surface-2 text-text-primary"
                        : "text-text-tertiary hover:text-text-primary hover:bg-surface-2",
                    )}
                    title="Ações"
                  >
                    <PencilSimple size={13} />
                  </button>

                  {menuFichaId === ficha.id && (
                    <div className="absolute top-full right-0 mt-1 bg-surface-2 border border-border-divider rounded-xl shadow-elev-2 z-50 min-w-40 overflow-hidden py-1">
                      <button
                        type="button"
                        disabled={isArchived}
                        onClick={() => {
                          if (isArchived) return;
                          setMenuFichaId(null);
                          void startEditing(ficha);
                        }}
                        className={cn(
                          "flex items-center gap-2.5 w-full px-3 py-2 text-[12px] transition-colors text-left",
                          isArchived
                            ? "text-text-disabled cursor-not-allowed"
                            : "text-text-primary hover:bg-surface-3",
                        )}
                      >
                        <PencilSimple size={13} className="shrink-0" />
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={isArchived}
                        onClick={() => {
                          if (isArchived) return;
                          setMenuFichaId(null);
                          onDuplicateFicha(ficha);
                        }}
                        className={cn(
                          "flex items-center gap-2.5 w-full px-3 py-2 text-[12px] transition-colors text-left",
                          isArchived
                            ? "text-text-disabled cursor-not-allowed"
                            : "text-text-primary hover:bg-surface-3",
                        )}
                      >
                        <Copy size={13} className="shrink-0" />
                        Duplicar
                      </button>
                      {isArchived ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuFichaId(null);
                            onUnarchiveFicha(ficha.id);
                          }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-text-primary hover:bg-surface-3 transition-colors text-left"
                        >
                          <FolderSimple size={13} className="shrink-0" />
                          Desarquivar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuFichaId(null);
                            onArchiveFicha(ficha.id);
                          }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-text-primary hover:bg-surface-3 transition-colors text-left"
                        >
                          <FolderSimple size={13} className="shrink-0" />
                          Arquivar
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isArchived}
                        onClick={() => {
                          if (isArchived) return;
                          setMenuFichaId(null);
                          onCloneFicha(ficha);
                        }}
                        className={cn(
                          "flex items-center gap-2.5 w-full px-3 py-2 text-[12px] transition-colors text-left",
                          isArchived
                            ? "text-text-disabled cursor-not-allowed"
                            : "text-text-primary hover:bg-surface-3",
                        )}
                      >
                        <UsersThree size={13} className="shrink-0" />
                        Clonar
                      </button>
                      <button
                        type="button"
                        disabled={isArchived}
                        onClick={() => {
                          if (isArchived) return;
                          setMenuFichaId(null);
                          onDeleteFicha(ficha.id);
                        }}
                        className={cn(
                          "flex items-center gap-2.5 w-full px-3 py-2 text-[12px] transition-colors text-left",
                          isArchived
                            ? "text-text-disabled cursor-not-allowed"
                            : "text-danger hover:bg-surface-3",
                        )}
                      >
                        <Trash size={13} className="shrink-0" />
                        Excluir
                      </button>
                      {!isArchived && (
                        <button
                          type="button"
                          onClick={() => { setMenuFichaId(null); startReorder(ficha); }}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-text-primary hover:bg-surface-3 transition-colors text-left border-t border-border-divider mt-1"
                        >
                          <ArrowsDownUp size={13} className="shrink-0 text-text-tertiary" />
                          Reordenar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Exercise list — simple read-only */}
              <div className={cn("px-3 py-2 h-40 md:h-52 overflow-y-auto", isArchived && "pointer-events-none")}>
                {items.length === 0 ? (
                  <p className="text-[11px] text-text-tertiary text-center py-4">
                    Nenhum exercício
                  </p>
                ) : (
                  <ol className="flex flex-col gap-0.5">
                    {items.map((ex, idx) => (
                      <li key={idx} className="flex items-center gap-2 py-1">
                        <span className="text-[10px] text-text-tertiary tabular-nums w-4 shrink-0 text-right">
                          {idx + 1}.
                        </span>
                        <p className="text-[12px] text-text-primary truncate leading-snug">
                          {exerciseTitle(ex)}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Footer */}
              {!isArchived && (
                <button
                  type="button"
                  onClick={() => onAddExercise(ficha.id)}
                  className="mx-3 mb-3 text-left text-[11px] font-semibold text-brand hover:text-brand-hover border-0 bg-transparent py-1.5 transition-colors"
                >
                  + adicionar exercício
                </button>
              )}
              {isArchived && <div className="h-3" />}
            </div>
          );
        })}

        {/* ── Pending (quick build) fichas ── */}
        {pendingFichas.map((pending, idx) => {
          const isSaving = savingId === pending.tempId;
          const isLast = idx === pendingFichas.length - 1;
          return (
            <div
              key={pending.tempId}
              className="shrink-0 w-60 md:w-auto flex flex-col rounded-xl border border-brand/30 bg-surface-1"
            >
              {/* Header */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-divider">
                <div className="field-flat-input flex-1 min-w-0">
                  <input
                    ref={isLast ? latestInputRef : undefined}
                    type="text"
                    value={pending.nome}
                    onChange={(e) =>
                      setPendingFichas((prev) =>
                        prev.map((f) =>
                          f.tempId === pending.tempId ? { ...f, nome: e.target.value } : f,
                        ),
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void savePendingFicha(pending);
                    }}
                    placeholder="Nome do treino…"
                    className="w-full text-[13px] font-semibold"
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={!pending.nome.trim() || isSaving}
                    onClick={() => void savePendingFicha(pending)}
                    className="w-7 h-7 rounded-md text-text-tertiary hover:text-success hover:bg-surface-2 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Salvar ficha"
                  >
                    <FloppyDisk size={14} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removePendingFicha(pending.tempId)}
                    className="w-7 h-7 rounded-md text-text-tertiary hover:text-danger hover:bg-surface-2 flex items-center justify-center transition-colors"
                    title="Descartar"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Exercise editor — series + rest per exercise */}
              <div className="px-3 max-h-72 md:max-h-80 overflow-y-auto">
                {pending.exercicios.length === 0 ? (
                  <p className="text-[11px] text-text-tertiary text-center py-4">
                    Nenhum exercício adicionado
                  </p>
                ) : (
                  pending.exercicios.map((ex, i) => (
                    <QuickExItem
                      key={ex.id + i}
                      ex={ex}
                      index={i}
                      onRemove={() => removePendingEx(pending.tempId, i)}
                      onChange={(u) => updatePendingEx(pending.tempId, i, u)}
                    />
                  ))
                )}
                {saveError && savingId === null && (
                  <p className="text-[10px] text-danger pb-1 mt-1">{saveError}</p>
                )}
              </div>

              {/* Footer */}
              <button
                type="button"
                onClick={() => void openAddEx({ type: "pending", id: pending.tempId })}
                disabled={catalogLoading}
                className="mx-3 mb-3 text-left text-[11px] font-semibold text-brand hover:text-brand-hover border-0 bg-transparent py-1.5 transition-colors disabled:opacity-50"
              >
                {catalogLoading ? "Carregando…" : "+ adicionar exercício"}
              </button>
            </div>
          );
        })}

        {/* ── Montagem rápida CTA — desktop last column ── */}
        <button
          type="button"
          onClick={() => void addPendingFicha()}
          className="hidden md:flex shrink-0 min-h-36 rounded-xl border border-dashed border-[#D4A843]/35 bg-transparent text-[11px] font-medium text-[#D4A843] hover:border-[#D4A843]/60 hover:bg-[#D4A843]/5 transition-colors flex-col items-center justify-center gap-2"
        >
          <Lightning size={18} weight="fill" />
          montagem rápida
        </button>
      </div>

      {/* ── Montagem rápida CTA — mobile below scroll ── */}
      <button
        type="button"
        onClick={() => void addPendingFicha()}
        className="md:hidden w-full min-h-18 rounded-xl border border-dashed border-[#D4A843]/35 bg-transparent text-[11px] font-medium text-[#D4A843] hover:border-[#D4A843]/60 hover:bg-[#D4A843]/5 transition-colors flex items-center justify-center gap-2"
      >
        <Lightning size={18} weight="fill" />
        montagem rápida
      </button>

      {/* ── Exercise reorder modal ── */}
      {reorderFichaId && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-1 w-full max-w-md rounded-2xl flex flex-col max-h-[min(80vh,640px)] overflow-hidden shadow-elev-3">
            {/* Header */}
            <div className="flex items-center px-4 py-3.5 border-b border-border-divider">
              <div className="flex-1" />
              <h3 className="text-[13px] font-bold text-text-primary">
                Reordenar exercícios
              </h3>
              <div className="flex-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => { setReorderFichaId(null); setReorderItems([]); }}
                  className="w-7 h-7 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 flex items-center justify-center transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Draggable list — pointer drag (mobile + desktop) */}
            <div ref={reorderListRef} className="overflow-y-auto flex-1 overscroll-contain">
              {reorderItems.length === 0 ? (
                <p className="text-[12px] text-text-tertiary text-center py-8">
                  Nenhum exercício
                </p>
              ) : (
                reorderItems.map((entry, idx) => {
                  const isDragging = reorderDragIdx === idx;
                  return (
                    <div
                      key={entry.key}
                      ref={(el) => { reorderItemRefs.current[idx] = el; }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3.5 border-b border-border-divider select-none transition-[box-shadow,transform,background-color,opacity] duration-150",
                        isDragging
                          ? "relative z-10 bg-surface-2 shadow-elev-3 scale-[1.02] border-brand/40 rounded-lg mx-1"
                          : "bg-surface-1",
                        reorderDragIdx !== null && !isDragging && "opacity-55",
                      )}
                    >
                      <span className="text-[10px] text-text-tertiary tabular-nums w-4 shrink-0 text-right">
                        {idx + 1}.
                      </span>
                      <span className="text-[13px] text-text-primary flex-1 truncate">
                        {exerciseTitle(entry.data)}
                      </span>
                      <button
                        type="button"
                        onPointerDown={(e) => onReorderPointerDown(idx, e)}
                        onPointerMove={onReorderPointerMove}
                        onPointerUp={onReorderPointerUp}
                        onPointerCancel={onReorderPointerUp}
                        className={cn(
                          "shrink-0 p-2 -mr-1 cursor-grab active:cursor-grabbing text-text-tertiary hover:text-text-secondary touch-none",
                          isDragging && "text-brand",
                        )}
                        style={{ touchAction: "none" }}
                        aria-label="Segurar e arrastar para reordenar"
                      >
                        <List size={18} weight={isDragging ? "bold" : "regular"} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border-divider">
              <button
                type="button"
                disabled={savingReorder}
                onClick={() => void saveReorder()}
                className="w-full h-10 rounded-xl bg-brand hover:bg-brand-hover text-text-on-brand text-[13px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {savingReorder ? "Salvando…" : "Concluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Exercise library modal ── */}
      {addExTarget && (() => {
        let existingIds = new Set<string>();
        if (addExTarget.type === "pending") {
          const pending = pendingFichas.find((f) => f.tempId === addExTarget.id);
          existingIds = new Set(pending?.exercicios.map((e) => e.id) ?? []);
        } else if (addExTarget.type === "editing" && editingData) {
          existingIds = new Set(editingData.exercicios.map((e) => e.id));
        }
        return (
          <ExerciseLibraryModal
            catalog={catalog}
            existingIds={existingIds}
            onClose={() => setAddExTarget(null)}
            onAdd={handleAddExercises}
          />
        );
      })()}
    </div>
  );
}
