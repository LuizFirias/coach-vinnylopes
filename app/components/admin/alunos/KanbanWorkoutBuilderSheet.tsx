"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Plus, Barbell } from "@phosphor-icons/react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/app/components/AuthProvider";
import { ExerciseList } from "@/app/components/workout-builder/ExerciseList";
import { WorkoutPrescriptionSummary } from "@/app/components/workout-builder/WorkoutPrescriptionSummary";
import {
  ExerciseLibraryModal,
  type LibraryExercise,
} from "@/app/components/workout-builder/ExerciseLibraryModal";
import type { ExercicioFicha, SerieDefinicao } from "@/app/components/workout-builder/types";
import type { ExercicioFichaItem } from "@/lib/utils/biset";
import {
  serializeFichaItems,
  simpleToBiSetGroup,
  bisetGroupToSimples,
  halfFromCatalog,
  validateBiSetGroup,
  isBiSetFichaItem,
} from "@/lib/utils/biset";
import { Button } from "@/components/ui/Button";

function criarSeriesPadrao(tipo: string): SerieDefinicao[] {
  const base = {
    ordem: 1,
    tecnica: "",
    tecnica_extra: "",
    peso_sugerido: null as number | null,
  };
  switch (tipo) {
    case "Duração":
    case "Duração e Peso":
    case "Distância e Duração":
      return [1, 2, 3].map((o) => ({ ...base, ordem: o, tempo_sugerido: "01:00" }));
    case "Peso e Distância":
      return [1, 2, 3].map((o) => ({ ...base, ordem: o, distancia_sugerida: 0 }));
    default:
      return [1, 2, 3].map((o) => ({ ...base, ordem: o, reps_sugerido: "12" }));
  }
}

function exercicioFromCatalog(ex: LibraryExercise): ExercicioFicha {
  const tipoEx = ex.tipo_exercicio || "Peso & Repetições";
  return {
    instanceId: crypto.randomUUID(),
    id: ex.id,
    nome: ex.nome,
    tipo_exercicio: tipoEx,
    descanso: "01:00",
    video_url: ex.video_url || "",
    observacoes: "",
    series: criarSeriesPadrao(tipoEx),
  };
}

interface KanbanWorkoutBuilderSheetProps {
  open: boolean;
  alunoId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function KanbanWorkoutBuilderSheet({
  open,
  alunoId,
  onClose,
  onSaved,
}: KanbanWorkoutBuilderSheetProps) {
  const { user } = useAuth();
  const [nomeRotina, setNomeRotina] = useState("");
  const [items, setItems] = useState<ExercicioFichaItem[]>([]);
  const [catalog, setCatalog] = useState<LibraryExercise[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bisetToast, setBisetToast] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNomeRotina("");
    setItems([]);
    setError(null);
    setLibraryOpen(false);
    setLoadingCatalog(true);
    void (async () => {
      const { data } = await supabaseClient
        .from("exercicios_biblioteca")
        .select("id, nome, grupo_muscular, tipo_exercicio, video_url")
        .order("nome", { ascending: true });
      setCatalog((data as LibraryExercise[]) || []);
      setLoadingCatalog(false);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !libraryOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, libraryOpen, onClose]);

  const showBisetToast = (msg: string) => {
    setBisetToast(msg);
    setTimeout(() => setBisetToast(null), 3500);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const addFromLibrary = (selected: LibraryExercise[]) => {
    setItems((prev) => [...prev, ...selected.map(exercicioFromCatalog)]);
    setLibraryOpen(false);
  };

  const duplicarExercicio = (index: number) => {
    setItems((prev) => {
      const item = prev[index];
      if (!item || isBiSetFichaItem(item)) return prev;
      const copy: ExercicioFicha = {
        ...item,
        instanceId: crypto.randomUUID(),
        series: item.series.map((s) => ({ ...s })),
      };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const transformarEmBiSet = (index: number) => {
    setItems((prev) => {
      const item = prev[index];
      if (!item || isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      next[index] = simpleToBiSetGroup(item);
      return next;
    });
  };

  const selecionarParceiroBiSet = (index: number, ex: LibraryExercise) => {
    setItems((prev) => {
      const item = prev[index];
      if (!item || !isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      next[index] = {
        ...item,
        exercicioB: halfFromCatalog(ex, item.exercicioA.series.map((s) => ({ ...s }))),
      };
      return next;
    });
  };

  const trocarParceiroBiSet = (index: number) => {
    setItems((prev) => {
      const item = prev[index];
      if (!item || !isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      next[index] = { ...item, exercicioB: null };
      return next;
    });
  };

  const desfazerBiSet = (index: number) => {
    setItems((prev) => {
      const item = prev[index];
      if (!item || !isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      next.splice(index, 1, ...bisetGroupToSimples(item));
      return next;
    });
  };

  const atualizarBiSetDescanso = (index: number, descanso: string) => {
    setItems((prev) => {
      const item = prev[index];
      if (!item || !isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      next[index] = { ...item, descanso };
      return next;
    });
  };

  const atualizarBiSetHalf = (
    index: number,
    half: "a" | "b",
    patch: { nome?: string; observacoes?: string },
  ) => {
    setItems((prev) => {
      const item = prev[index];
      if (!item || !isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      const group = { ...item };
      if (half === "a") group.exercicioA = { ...group.exercicioA, ...patch };
      else if (group.exercicioB) group.exercicioB = { ...group.exercicioB, ...patch };
      next[index] = group;
      return next;
    });
  };

  const atualizarBiSetSerie = (
    index: number,
    half: "a" | "b",
    serieIndex: number,
    campo: string,
    valor: unknown,
  ) => {
    if (campo === "tecnica_extra" && valor === "Bi-Set") return;
    setItems((prev) => {
      const item = prev[index];
      if (!item || !isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      const group = {
        ...item,
        exercicioA: { ...item.exercicioA, series: [...item.exercicioA.series] },
      };
      if (group.exercicioB)
        group.exercicioB = { ...group.exercicioB, series: [...group.exercicioB.series] };
      const target = half === "a" ? group.exercicioA : group.exercicioB;
      if (!target) return prev;
      target.series[serieIndex] = { ...target.series[serieIndex], [campo]: valor };
      next[index] = group;
      return next;
    });
  };

  const adicionarSerieBiSet = (index: number) => {
    setItems((prev) => {
      const item = prev[index];
      if (!item || !isBiSetFichaItem(item) || !item.exercicioB) return prev;
      const next = [...prev];
      const group = {
        ...item,
        exercicioA: { ...item.exercicioA, series: [...item.exercicioA.series] },
        exercicioB: { ...item.exercicioB, series: [...item.exercicioB.series] },
      };
      const modeloA = group.exercicioA.series[group.exercicioA.series.length - 1];
      const modeloB = group.exercicioB.series[group.exercicioB.series.length - 1];
      const ordem = group.exercicioA.series.length + 1;
      group.exercicioA.series.push({ ...modeloA, ordem });
      group.exercicioB.series.push({ ...modeloB, ordem });
      next[index] = group;
      return next;
    });
  };

  const removerSerieBiSet = (index: number, serieIndex: number) => {
    setItems((prev) => {
      const item = prev[index];
      if (!item || !isBiSetFichaItem(item) || !item.exercicioB) return prev;
      const next = [...prev];
      const group = {
        ...item,
        exercicioA: { ...item.exercicioA, series: [...item.exercicioA.series] },
        exercicioB: { ...item.exercicioB, series: [...item.exercicioB.series] },
      };
      group.exercicioA.series = group.exercicioA.series
        .filter((_, i) => i !== serieIndex)
        .map((s, i) => ({ ...s, ordem: i + 1 }));
      group.exercicioB.series = group.exercicioB.series
        .filter((_, i) => i !== serieIndex)
        .map((s, i) => ({ ...s, ordem: i + 1 }));
      next[index] = group;
      return next;
    });
    showBisetToast(
      "Em Bi-Sets, séries são adicionadas e removidas em par. Ambos os exercícios foram atualizados.",
    );
  };

  const removerExercicioSimple = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const atualizarExercicio = (index: number, patch: Partial<ExercicioFicha>) => {
    setItems((prev) => {
      const item = prev[index];
      if (!item || isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      next[index] = { ...item, ...patch };
      return next;
    });
  };

  const atualizarSerie = (
    exIndex: number,
    serieIndex: number,
    campo: string,
    valor: unknown,
  ) => {
    if (campo === "tecnica_extra" && valor === "Bi-Set") {
      transformarEmBiSet(exIndex);
      return;
    }
    setItems((prev) => {
      const item = prev[exIndex];
      if (!item || isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      const series = [...item.series];
      series[serieIndex] = { ...series[serieIndex], [campo]: valor };
      next[exIndex] = { ...item, series };
      return next;
    });
  };

  const adicionarSerie = (exIndex: number) => {
    setItems((prev) => {
      const item = prev[exIndex];
      if (!item || isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      const series = item.series;
      const proximaOrdem =
        series.length > 0 ? Math.max(...series.map((s) => s.ordem)) + 1 : 1;
      const modelo = series[series.length - 1] || {
        reps_sugerido: "12",
        tempo_sugerido: "01:00",
        tecnica: "",
        tecnica_extra: "",
        peso_sugerido: null,
      };
      next[exIndex] = {
        ...item,
        series: [...series, { ...modelo, ordem: proximaOrdem }],
      };
      return next;
    });
  };

  const removerSerie = (exIndex: number, serieIndex: number) => {
    setItems((prev) => {
      const item = prev[exIndex];
      if (!item || isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      next[exIndex] = {
        ...item,
        series: item.series
          .filter((_, i) => i !== serieIndex)
          .map((s, i) => ({ ...s, ordem: i + 1 })),
      };
      return next;
    });
  };

  const handleSave = useCallback(async () => {
    setError(null);
    if (!nomeRotina.trim()) {
      setError("Digite o nome do treino");
      return;
    }
    if (items.length === 0) {
      setError("Adicione pelo menos um exercício");
      return;
    }
    for (const item of items) {
      if (isBiSetFichaItem(item)) {
        const err = validateBiSetGroup(item);
        if (err) {
          setError(err);
          return;
        }
      }
    }
    if (!user?.id) {
      setError("Sessão expirada");
      return;
    }

    setSaving(true);
    try {
      const { error: insertError } = await supabaseClient.from("fichas_treino").insert({
        aluno_id: alunoId,
        coach_id: user.id,
        nome_rotina: nomeRotina.trim(),
        configuracao: { exercicios: serializeFichaItems(items) },
        ativo: true,
      });
      if (insertError) throw insertError;
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar treino");
    } finally {
      setSaving(false);
    }
  }, [alunoId, items, nomeRotina, onClose, onSaved, user?.id]);

  if (!open) return null;

  const canSave = !!nomeRotina.trim() && items.length > 0 && !saving;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0d0d0d]/90 backdrop-blur-sm">
      <div className="flex-1 flex flex-col min-h-0 max-w-[min(960px,96vw)] w-full mx-auto my-3 md:my-6 rounded-xl border border-[#222222] bg-[#141414] overflow-hidden">
        <div className="shrink-0 px-4 py-3 border-b border-[#222222] flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[1px] text-[#7a8aab] mb-1">
              Novo treino
            </p>
            <input
              type="text"
              value={nomeRotina}
              onChange={(e) => setNomeRotina(e.target.value)}
              placeholder="Ex.: Upper A, Lower, Full Body..."
              className="w-full bg-transparent text-lg font-bold text-white placeholder:text-[#555555] focus:outline-none"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              loading={saving}
              disabled={!canSave}
              onClick={() => void handleSave()}
            >
              Salvar
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-[#1e1e1e] text-[#7a8aab] hover:text-white flex items-center justify-center"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {error && (
            <p className="text-xs text-[#e05555] bg-[#e05555]/10 border border-[#e05555]/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {bisetToast && (
            <p className="text-xs text-white bg-[#1a2d4a] border-l-[3px] border-[#2b7fff] rounded-lg px-3 py-2">
              {bisetToast}
            </p>
          )}

          <WorkoutPrescriptionSummary items={items} isMobile={false} />

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Exercícios{" "}
              <span className="text-[#2b7fff]">({items.length})</span>
            </h3>
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              disabled={loadingCatalog}
              className="inline-flex items-center gap-1.5 px-3 h-8 border border-[#282828] bg-[#1e1e1e] text-[#7a8aab] rounded-lg text-xs font-semibold hover:text-[#2b7fff] hover:border-[#2b7fff]/40"
            >
              <Plus size={14} weight="bold" /> Adicionar exercício
            </button>
          </div>

          {items.length === 0 ? (
            <div className="border border-dashed border-[#282828] rounded-xl p-8 flex flex-col items-center text-center">
              <Barbell size={28} className="text-[#555555] mb-2" />
              <p className="text-xs text-[#555555] mb-4">
                Adicione exercícios e configure séries, técnicas e Bi-Sets aqui.
              </p>
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                className="px-4 h-9 bg-[#2b7fff] text-white rounded-lg text-xs font-semibold"
              >
                Abrir biblioteca
              </button>
            </div>
          ) : (
            <ExerciseList
              items={items}
              catalog={catalog}
              onReorder={handleReorder}
              onUpdateSimple={atualizarExercicio}
              onDeleteSimple={removerExercicioSimple}
              onDuplicateSimple={duplicarExercicio}
              onAddSetSimple={adicionarSerie}
              onUpdateSerieSimple={atualizarSerie}
              onDeleteSerieSimple={removerSerie}
              onUpdateBiSetDescanso={atualizarBiSetDescanso}
              onUpdateBiSetHalf={atualizarBiSetHalf}
              onUpdateBiSetSerie={atualizarBiSetSerie}
              onAddBiSetSerie={adicionarSerieBiSet}
              onRemoveBiSetSerie={removerSerieBiSet}
              onSelectBiSetPartner={selecionarParceiroBiSet}
              onSwapBiSetPartner={trocarParceiroBiSet}
              onUndoBiSet={desfazerBiSet}
              onDeleteBiSet={removerExercicioSimple}
              onBiSetSerieToast={() =>
                showBisetToast("Séries de Bi-Set atualizadas em par.")
              }
            />
          )}
        </div>
      </div>

      {libraryOpen && (
        <ExerciseLibraryModal
          catalog={catalog}
          onClose={() => setLibraryOpen(false)}
          onAdd={addFromLibrary}
        />
      )}
    </div>
  );
}
