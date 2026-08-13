"use client";

import { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  Plus,
  X,
  Barbell,
  WarningCircle,
  FloppyDisk,
  CircleNotch,
} from "@phosphor-icons/react";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { useAuth } from "@/app/components/AuthProvider";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { cn } from "@/lib/utils/cn";
import { alunoTreinosReturnUrl, readReturnUrl } from "@/lib/utils/adminNav";
import { WorkoutBuilderHeader } from "@/app/components/workout-builder/WorkoutBuilderHeader";
import { WorkoutBuilderBottomBar } from "@/app/components/workout-builder/WorkoutBuilderBottomBar";
import { WorkoutBuilderSettingsSheet } from "@/app/components/workout-builder/WorkoutBuilderSettingsSheet";
import { ExerciseList } from "@/app/components/workout-builder/ExerciseList";
import { WorkoutPrescriptionSummary } from "@/app/components/workout-builder/WorkoutPrescriptionSummary";
import {
  ExerciseLibraryModal,
  type LibraryExercise,
} from "@/app/components/workout-builder/ExerciseLibraryModal";
import { LibraryPanel } from "@/app/components/workout-builder/LibraryPanel";
import type { ExercicioFicha, SerieDefinicao } from "@/app/components/workout-builder/types";
import { TIPOS_EXERCICIO } from "@/app/components/workout-builder/exerciseColumns";
import type { ExercicioFichaItem } from "@/lib/utils/biset";
import {
  parseFichaItems,
  serializeFichaItems,
  simpleToBiSetGroup,
  bisetGroupToSimples,
  halfFromCatalog,
  validateBiSetGroup,
  isBiSetFichaItem,
} from "@/lib/utils/biset";
import { CANONICAL_EQUIPMENTS } from "@/lib/constants/equipment";
import { concluirPasso } from "@/lib/onboarding/concluirPasso";
import { isClusterSet } from "@/lib/constants/workout-techniques";

export interface WorkoutBuilderScreenProps {
  mode?: "create" | "edit";
  /** Prefill (create) ou aluno fixo (edit) */
  alunoId?: string;
  /** Obrigatório em mode="edit" */
  fichaId?: string;
  fallbackReturn?: string;
}

interface Aluno {
  id: string;
  coaching_reference: string;
  email: string;
}

interface Exercicio {
  id: string;
  nome: string;
  grupo_muscular: string;
  tipo_exercicio?: string;
  equipamento?: string;
  video_url?: string;
}

const EQUIPAMENTOS = [...CANONICAL_EQUIPMENTS];

const inputCls = "w-full bg-surface-2 border border-input text-text-primary px-3 py-2 rounded-lg text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors h-10";
const selectCls = "w-full bg-surface-2 border border-input text-text-primary px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-brand/40 transition-colors appearance-none h-10";

function criarSeriesPadrao(tipo: string): SerieDefinicao[] {
  const base = { ordem: 1, tecnica: "", tecnica_extra: "", peso_sugerido: null as number | null };
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

function exercicioFromCatalog(ex: Exercicio): ExercicioFicha {
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

export function WorkoutBuilderScreen({
  mode = "create",
  alunoId,
  fichaId,
  fallbackReturn,
}: WorkoutBuilderScreenProps) {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const isMobile = useBreakpoint("mobile");
  const isEdit = mode === "edit";

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [exerciciosCatalogo, setExerciciosCatalogo] = useState<Exercicio[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState(alunoId || "");
  const [nomeRotina, setNomeRotina] = useState("");
  const [exerciciosFicha, setExerciciosFicha] = useState<ExercicioFichaItem[]>([]);
  const [bisetToast, setBisetToast] = useState<string | null>(null);
  const [modalExercicio, setModalExercicio] = useState(false);
  const [modalNovoExercicio, setModalNovoExercicio] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [novoExercicioForm, setNovoExercicioForm] = useState({
    nome: "", grupo_muscular: "", descricao: "", video_url: "", equipamento: "", tipo_exercicio: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [alunoFromParam, setAlunoFromParam] = useState(!!alunoId);
  const [dragHint, setDragHint] = useState<string | null>(null);
  /** Índice do Bi-Set aguardando seleção do exercício B na biblioteca */
  const [biSetPickIndex, setBiSetPickIndex] = useState<number | null>(null);
  const libraryAnchorRef = useRef<HTMLDivElement>(null);
  const [libraryFloatRect, setLibraryFloatRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const startBiSetPartnerPick = useCallback(
    (index: number) => {
      setBiSetPickIndex(index);
      if (isMobile) setModalExercicio(true);
    },
    [isMobile],
  );

  const clearBiSetPartnerPick = useCallback(() => {
    setBiSetPickIndex(null);
    setModalExercicio(false);
  }, []);

  const cancelBiSetPartnerPick = useCallback(() => {
    setBiSetPickIndex((idx) => {
      if (idx == null) return null;
      setExerciciosFicha((prev) => {
        const item = prev[idx];
        if (!item || !isBiSetFichaItem(item) || item.exercicioB) return prev;
        const simples = bisetGroupToSimples(item);
        const next = [...prev];
        next.splice(idx, 1, ...simples);
        return next;
      });
      return null;
    });
    setModalExercicio(false);
  }, []);

  useEffect(() => {
    if (isEdit) return;
    const params = new URLSearchParams(window.location.search);
    const param = params.get("alunoId") || alunoId;
    if (param) {
      setAlunoSelecionado(param);
      setAlunoFromParam(true);
    }
  }, [isEdit, alunoId]);

  const resolvedFallback =
    fallbackReturn ||
    (isEdit && alunoId ? alunoTreinosReturnUrl(alunoId) : "/admin/treinos");

  const goBack = useCallback(() => {
    const target = readReturnUrl(window.location.search, resolvedFallback);
    router.push(target);
  }, [router, resolvedFallback]);

  const loadData = useCallback(async (coachId: string) => {
    setLoading(true);
    try {
      if (userRole !== "coach" && userRole !== "super_admin") {
        router.push("/aluno/dashboard");
        return;
      }

      const { data: alunoLinks } = await supabaseClient
        .from("coach_alunos").select("aluno_id").eq("coach_id", coachId);

      const alunoIds = alunoLinks?.map((link) => link.aluno_id) || [];
      let alunosData: Aluno[] = [];
      if (alunoIds.length > 0) {
        const { data } = await supabaseClient
          .from("profiles").select("id, coaching_reference, email")
          .in("id", alunoIds).eq("arquivado", false)
          .order("coaching_reference", { ascending: true });
        alunosData = (data as Aluno[]) || [];
      }
      setAlunos(alunosData);

      const { data: exerciciosData } = await supabaseClient
        .from("exercicios_biblioteca").select("id, nome, grupo_muscular, tipo_exercicio, equipamento, video_url")
        .order("nome", { ascending: true });
      setExerciciosCatalogo(exerciciosData || []);

      if (isEdit && fichaId) {
        const { data: ficha, error: fichaError } = await supabaseClient
          .from("fichas_treino")
          .select("id, nome_rotina, configuracao, coach_id, aluno_id")
          .eq("id", fichaId)
          .single();

        if (fichaError || !ficha) throw fichaError || new Error("Ficha não encontrada");
        if (ficha.coach_id !== coachId && userRole !== "super_admin") {
          throw new Error("Sem permissão para editar esta ficha");
        }

        setAlunoSelecionado(ficha.aluno_id || alunoId || "");
        setNomeRotina(ficha.nome_rotina || "");
        setExerciciosFicha(
          parseFichaItems(
            (ficha.configuracao as { exercicios?: unknown[] } | null)?.exercicios || [],
          ),
        );
        setIsDirty(false);

        // Garante o aluno na lista mesmo se arquivado
        if (
          ficha.aluno_id &&
          !alunosData.some((a) => a.id === ficha.aluno_id)
        ) {
          const { data: alunoExtra } = await supabaseClient
            .from("profiles")
            .select("id, coaching_reference, email")
            .eq("id", ficha.aluno_id)
            .maybeSingle();
          if (alunoExtra) {
            setAlunos((prev) => [...prev, alunoExtra as Aluno]);
          }
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      if (isEdit) {
        alert(
          err instanceof Error ? err.message : "Erro ao carregar a ficha.",
        );
        router.push(resolvedFallback);
      }
    } finally {
      setLoading(false);
    }
  }, [router, userRole, isEdit, fichaId, alunoId, resolvedFallback]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      router.push("/login");
      return;
    }
    void loadData(user.id);
  }, [authLoading, user?.id, loadData, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("workout_builder_drag_hint") && exerciciosFicha.length > 1) {
      setDragHint("Segure o ícone ⠿ e arraste para reordenar os exercícios");
      localStorage.setItem("workout_builder_drag_hint", "1");
      const t = setTimeout(() => setDragHint(null), 5000);
      return () => clearTimeout(t);
    }
  }, [exerciciosFicha.length]);

  const showBisetToast = (msg: string) => {
    setBisetToast(msg);
    setTimeout(() => setBisetToast(null), 3500);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const next = [...exerciciosFicha];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setExerciciosFicha(next);
    markDirty();
  };

  const adicionarExercicio = (ex: Exercicio) => {
    if (biSetPickIndex != null) {
      selecionarParceiroBiSet(biSetPickIndex, ex);
      return;
    }
    setExerciciosFicha((prev) => [...prev, exercicioFromCatalog(ex)]);
    markDirty();
    setModalExercicio(false);
  };

  const handleAddFromLibrary = (selected: LibraryExercise[]) => {
    if (biSetPickIndex != null && selected[0]) {
      selecionarParceiroBiSet(biSetPickIndex, selected[0] as Exercicio);
      return;
    }
    const novos = selected.map((ex) => exercicioFromCatalog(ex as Exercicio));
    setExerciciosFicha((prev) => [...prev, ...novos]);
    markDirty();
    if (isMobile) setModalExercicio(false);
  };


  const transformarEmBiSet = (index: number) => {
    setExerciciosFicha((prev) => {
      const item = prev[index];
      if (!item || isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      next[index] = simpleToBiSetGroup(item);
      return next;
    });
    markDirty();
    startBiSetPartnerPick(index);
  };

  const selecionarParceiroBiSet = (index: number, ex: Exercicio) => {
    setExerciciosFicha((prev) => {
      const item = prev[index];
      if (!item || !isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      const group = { ...item };
      group.exercicioB = halfFromCatalog(ex, item.exercicioA.series.map((s) => ({ ...s })));
      next[index] = group;
      return next;
    });
    markDirty();
    clearBiSetPartnerPick();
  };

  const trocarParceiroBiSet = (index: number) => {
    setExerciciosFicha((prev) => {
      const item = prev[index];
      if (!item || !isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      next[index] = { ...item, exercicioB: null };
      return next;
    });
    markDirty();
    startBiSetPartnerPick(index);
  };

  const desfazerBiSet = (index: number) => {
    setExerciciosFicha((prev) => {
      const item = prev[index];
      if (!item || !isBiSetFichaItem(item)) return prev;
      const simples = bisetGroupToSimples(item);
      const next = [...prev];
      next.splice(index, 1, ...simples);
      return next;
    });
    markDirty();
    if (biSetPickIndex === index) clearBiSetPartnerPick();
  };

  const removerGrupoBiSet = (index: number) => {
    removerExercicioSimple(index);
  };

  const atualizarBiSetDescanso = (index: number, descanso: string) => {
    setExerciciosFicha((prev) => {
      const item = prev[index];
      if (!item || !isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      next[index] = { ...item, descanso };
      return next;
    });
    markDirty();
  };

  const atualizarBiSetHalf = (index: number, half: "a" | "b", patch: { nome?: string; observacoes?: string }) => {
    setExerciciosFicha((prev) => {
      const item = prev[index];
      if (!item || !isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      const group = { ...item };
      if (half === "a") group.exercicioA = { ...group.exercicioA, ...patch };
      else if (group.exercicioB) group.exercicioB = { ...group.exercicioB, ...patch };
      next[index] = group;
      return next;
    });
    markDirty();
  };

  const atualizarBiSetSerie = (index: number, half: "a" | "b", serieIndex: number, campo: string, valor: unknown) => {
    if (campo === "tecnica_extra" && valor === "Bi-Set") return;
    setExerciciosFicha((prev) => {
      const item = prev[index];
      if (!item || !isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      const group = { ...item, exercicioA: { ...item.exercicioA, series: [...item.exercicioA.series] } };
      if (group.exercicioB) group.exercicioB = { ...group.exercicioB, series: [...group.exercicioB.series] };
      const target = half === "a" ? group.exercicioA : group.exercicioB;
      if (!target) return prev;
      target.series[serieIndex] = { ...target.series[serieIndex], [campo]: valor };
      next[index] = group;
      return next;
    });
    markDirty();
  };

  const adicionarSerieBiSet = (index: number) => {
    setExerciciosFicha((prev) => {
      const item = prev[index];
      if (!item || !isBiSetFichaItem(item) || !item.exercicioB) return prev;
      const next = [...prev];
      const group = { ...item, exercicioA: { ...item.exercicioA, series: [...item.exercicioA.series] }, exercicioB: { ...item.exercicioB, series: [...item.exercicioB.series] } };
      const modeloA = group.exercicioA.series[group.exercicioA.series.length - 1];
      const modeloB = group.exercicioB.series[group.exercicioB.series.length - 1];
      const ordem = group.exercicioA.series.length + 1;
      group.exercicioA.series.push({ ...modeloA, ordem });
      group.exercicioB.series.push({ ...modeloB, ordem });
      next[index] = group;
      return next;
    });
    markDirty();
  };

  const removerSerieBiSet = (index: number, serieIndex: number) => {
    setExerciciosFicha((prev) => {
      const item = prev[index];
      if (!item || !isBiSetFichaItem(item) || !item.exercicioB) return prev;
      const next = [...prev];
      const group = { ...item, exercicioA: { ...item.exercicioA, series: [...item.exercicioA.series] }, exercicioB: { ...item.exercicioB, series: [...item.exercicioB.series] } };
      group.exercicioA.series = group.exercicioA.series.filter((_, i) => i !== serieIndex).map((s, i) => ({ ...s, ordem: i + 1 }));
      group.exercicioB.series = group.exercicioB.series.filter((_, i) => i !== serieIndex).map((s, i) => ({ ...s, ordem: i + 1 }));
      next[index] = group;
      return next;
    });
    showBisetToast("Em Bi-Sets, séries são adicionadas e removidas em par. Ambos os exercícios foram atualizados.");
    markDirty();
  };

  const removerExercicioSimple = (index: number) => {
    setExerciciosFicha((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  };

  const atualizarExercicio = (index: number, patch: Partial<ExercicioFicha>) => {
    setExerciciosFicha((prev) => {
      const item = prev[index];
      if (!item || isBiSetFichaItem(item)) return prev;
      const novos = [...prev];
      novos[index] = { ...item, ...patch };
      return novos;
    });
    markDirty();
  };

  const atualizarSerie = (exIndex: number, serieIndex: number, campo: string, valor: unknown) => {
    if (campo === "tecnica_extra" && valor === "Bi-Set") {
      transformarEmBiSet(exIndex);
      return;
    }
    setExerciciosFicha((prev) => {
      const item = prev[exIndex];
      if (!item || isBiSetFichaItem(item)) return prev;
      const novos = [...prev];
      const series = [...item.series];
      const atual = series[serieIndex];
      let atualizada = { ...atual, [campo]: valor };
      // Saiu do Cluster Set — volta pro campo de reps simples (só numeral)
      if ((campo === "tecnica" || campo === "tecnica_extra") && isClusterSet(atual) && !isClusterSet(atualizada)) {
        atualizada = {
          ...atualizada,
          reps_sugerido: atual.cluster_reps != null ? String(atual.cluster_reps) : "",
          cluster_qtd: undefined,
          cluster_reps: undefined,
          cluster_descanso_seg: undefined,
        };
      }
      series[serieIndex] = atualizada;
      novos[exIndex] = { ...item, series };
      return novos;
    });
    markDirty();
  };

  const atualizarDescansoClusters = (exIndex: number, segundos: number) => {
    setExerciciosFicha((prev) => {
      const item = prev[exIndex];
      if (!item || isBiSetFichaItem(item)) return prev;
      const novos = [...prev];
      const series = item.series.map((s) =>
        isClusterSet(s) ? { ...s, cluster_descanso_seg: segundos } : s
      );
      novos[exIndex] = { ...item, series };
      return novos;
    });
    markDirty();
  };

  const adicionarSerie = (exIndex: number) => {
    setExerciciosFicha((prev) => {
      const item = prev[exIndex];
      if (!item || isBiSetFichaItem(item)) return prev;
      const novos = [...prev];
      const series = item.series;
      const proximaOrdem = series.length > 0 ? Math.max(...series.map((s) => s.ordem)) + 1 : 1;
      const modelo = series[series.length - 1] || {
        reps_sugerido: "12",
        tempo_sugerido: "01:00",
        tecnica: "",
        tecnica_extra: "",
        peso_sugerido: null,
      };
      novos[exIndex] = { ...item, series: [...series, { ...modelo, ordem: proximaOrdem }] };
      return novos;
    });
    markDirty();
  };

  const removerSerie = (exIndex: number, serieIndex: number) => {
    setExerciciosFicha((prev) => {
      const item = prev[exIndex];
      if (!item || isBiSetFichaItem(item)) return prev;
      const novos = [...prev];
      const series = item.series.filter((_, i) => i !== serieIndex).map((s, i) => ({ ...s, ordem: i + 1 }));
      novos[exIndex] = { ...item, series };
      return novos;
    });
    markDirty();
  };

  const criarNovoExercicio = async () => {
    setErroValidacao(null);
    const { nome, grupo_muscular, equipamento, tipo_exercicio, video_url } = novoExercicioForm;

    if (!nome.trim() || !grupo_muscular || !equipamento || !tipo_exercicio) {
      setErroValidacao("Preencha todos os campos obrigatórios (*)");
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from("exercicios_biblioteca")
        .insert({
          nome: nome.trim(),
          grupo_muscular,
          equipamento,
          tipo_exercicio,
          video_url: video_url.trim() || null,
          descricao: novoExercicioForm.descricao.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      setExerciciosCatalogo((prev) => [data, ...prev].sort((a, b) => a.nome.localeCompare(b.nome)));
      adicionarExercicio(data);
      setNovoExercicioForm({ nome: "", grupo_muscular: "", descricao: "", video_url: "", equipamento: "", tipo_exercicio: "" });
      setModalNovoExercicio(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar exercício.";
      setErroValidacao(message);
    }
  };

  const handleSalvarFicha = async () => {
    if (!alunoSelecionado) { alert("Selecione um aluno"); return; }
    if (!nomeRotina.trim()) { alert("Digite o nome da rotina"); return; }
    if (exerciciosFicha.length === 0) { alert("Adicione pelo menos um exercício"); return; }

    for (const item of exerciciosFicha) {
      if (isBiSetFichaItem(item)) {
        const err = validateBiSetGroup(item);
        if (err) { alert(err); return; }
      }
    }

    setSaving(true);
    try {
      const coachId = user?.id;
      if (!coachId) throw new Error("Sessão expirada");

      const configuracao = { exercicios: serializeFichaItems(exerciciosFicha) };

      if (isEdit) {
        if (!fichaId) throw new Error("Ficha inválida");
        const { error } = await supabaseClient
          .from("fichas_treino")
          .update({
            nome_rotina: nomeRotina.trim(),
            configuracao,
          })
          .eq("id", fichaId);
        if (error) throw error;
      } else {
        const { error } = await supabaseClient.from("fichas_treino").insert({
          aluno_id: alunoSelecionado,
          coach_id: coachId,
          nome_rotina: nomeRotina.trim(),
          configuracao,
          ativo: true,
        });
        if (error) throw error;
        await concluirPasso(coachId, "montar-ficha");
      }

      setIsDirty(false);
      goBack();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      alert("Erro ao salvar: " + message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (biSetPickIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        cancelBiSetPartnerPick();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [biSetPickIndex, cancelBiSetPartnerPick]);

  useLayoutEffect(() => {
    if (biSetPickIndex == null || isMobile) {
      setLibraryFloatRect(null);
      return;
    }

    const updateRect = () => {
      const el = libraryAnchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setLibraryFloatRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [biSetPickIndex, isMobile, exerciciosFicha.length]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text={isEdit ? "Carregando ficha..." : "Preparando ambiente..."} />
      </div>
    );
  }

  const canSave = !!alunoSelecionado && !!nomeRotina.trim() && exerciciosFicha.length > 0;

  const existingExerciseIds = new Set(
    exerciciosFicha.flatMap((item) =>
      isBiSetFichaItem(item)
        ? ([item.exercicioA.exercicio_id, item.exercicioB?.exercicio_id].filter(
            Boolean,
          ) as string[])
        : [item.id],
    ),
  );

  const biSetPickExcludeId = (() => {
    if (biSetPickIndex == null) return null;
    const item = exerciciosFicha[biSetPickIndex];
    if (!item || !isBiSetFichaItem(item)) return null;
    return item.exercicioA.exercicio_id;
  })();

  const isBiSetPicking = biSetPickIndex != null;

  const exerciseListProps = {
    items: exerciciosFicha,
    onReorder: handleReorder,
    onUpdateSimple: atualizarExercicio,
    onDeleteSimple: removerExercicioSimple,
    onAddSetSimple: adicionarSerie,
    onUpdateSerieSimple: atualizarSerie,
    onDeleteSerieSimple: removerSerie,
    onUpdateClusterDescanso: atualizarDescansoClusters,
    onUpdateBiSetDescanso: atualizarBiSetDescanso,
    onUpdateBiSetHalf: atualizarBiSetHalf,
    onUpdateBiSetSerie: atualizarBiSetSerie,
    onAddBiSetSerie: adicionarSerieBiSet,
    onRemoveBiSetSerie: removerSerieBiSet,
    onSwapBiSetPartner: trocarParceiroBiSet,
    onRequestBiSetPartnerPick: startBiSetPartnerPick,
    onUndoBiSet: desfazerBiSet,
    onDeleteBiSet: removerGrupoBiSet,
  };

  const headerShared = {
    alunos,
    alunoSelecionado,
    nomeRotina,
    saving,
    exporting: false,
    canSave,
    isDirty,
    alunoLocked: isEdit,
    saveLabel: isEdit ? "Salvar alterações" : "Salvar ficha",
    onBack: goBack,
    onAlunoChange: (id: string) => {
      if (isEdit) return;
      setAlunoSelecionado(id);
      markDirty();
    },
    onRotinaChange: (n: string) => {
      setNomeRotina(n);
      markDirty();
    },
    onSave: handleSalvarFicha,
    onOpenAlunoPicker: () => setSettingsOpen(true),
  };

  return (
    <div
      className={cn(
        "nova-ficha-screen min-h-screen bg-surface-0 lg:pl-28",
        isMobile ? "pb-[calc(5rem+env(safe-area-inset-bottom))]" : "pb-0",
      )}
    >
      {!isMobile ? (
        <div className="flex h-screen overflow-hidden justify-center">
          <div
            className="flex w-full gap-6 p-6 overflow-hidden"
            style={{ maxWidth: 1400 }}
          >
            <div
              className="relative flex flex-col overflow-hidden"
              style={{ flex: 1, minWidth: 0, maxWidth: 760 }}
            >
              <div className="flex flex-col overflow-hidden h-full">
                <div className="shrink-0 pb-4">
                  <WorkoutBuilderHeader
                    {...headerShared}
                    isMobile={false}
                  />

                  {dragHint && (
                    <div className="mt-3 px-3 py-2 bg-brand-subtle border border-brand-border rounded-lg text-xs text-brand text-center">
                      {dragHint}
                    </div>
                  )}
                  {bisetToast && (
                    <div className="mt-3 px-3 py-2.5 bg-[#1a2d4a] border-l-[3px] border-brand rounded-lg text-xs text-text-primary">
                      {bisetToast}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <h2 className="text-sm font-semibold text-text-primary">
                      Exercícios{" "}
                      <span className="text-brand">({exerciciosFicha.length})</span>
                    </h2>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {exerciciosFicha.length === 0 ? (
                    <div className="rounded-xl p-10 flex flex-col items-center text-center">
                      <Barbell size={40} className="text-text-disabled mb-3" />
                      <h3 className="text-sm font-semibold text-text-primary mb-1">
                        Nenhum exercício na ficha
                      </h3>
                      <p className="text-xs text-text-tertiary">
                        Clique em um exercício na biblioteca ao lado para adicionar.
                      </p>
                    </div>
                  ) : (
                    <ExerciseList {...exerciseListProps} />
                  )}
                </div>
              </div>
            </div>

            <div
              className="shrink-0 flex flex-col gap-4 overflow-hidden relative"
              style={{ width: 480 }}
            >
              <div className="flex flex-col gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleSalvarFicha}
                  disabled={saving || !canSave || !isDirty}
                  aria-label={isEdit ? "Salvar alterações" : "Salvar ficha"}
                  title={isEdit ? "Salvar alterações" : "Salvar ficha"}
                  className="w-full h-14 rounded-2xl flex items-center justify-center text-text-on-brand transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background:
                      "linear-gradient(135deg, #c084fc 0%, #751BB4 55%, #7e22ce 100%)",
                    boxShadow: "0 4px 16px rgba(117,27,180,0.35)",
                  }}
                >
                  {saving ? (
                    <CircleNotch size={22} className="animate-spin" weight="bold" />
                  ) : (
                    <FloppyDisk size={22} weight="fill" />
                  )}
                </button>
                <WorkoutPrescriptionSummary
                  items={exerciciosFicha}
                  isMobile={false}
                  hideWhenEmpty={false}
                  variant="stats"
                />
              </div>

              <div
                ref={libraryAnchorRef}
                className="flex-1 min-h-0 rounded-2xl border-0 bg-surface-1 shadow-sm overflow-hidden flex flex-col"
              >
                {/* Placeholder mantém o layout enquanto a biblioteca flutua no portal */}
                {isBiSetPicking ? (
                  <div className="flex-1 min-h-0" aria-hidden />
                ) : (
                  <LibraryPanel
                    catalog={exerciciosCatalogo}
                    existingIds={existingExerciseIds}
                    onAdd={handleAddFromLibrary}
                    onCreateNew={() => setModalNovoExercicio(true)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 md:px-0 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          <WorkoutBuilderHeader {...headerShared} isMobile={true} />

          {dragHint && (
            <div className="mb-3 px-3 py-2 bg-brand-subtle border border-brand-border rounded-lg text-xs text-brand text-center">
              {dragHint}
            </div>
          )}
          {bisetToast && (
            <div className="mb-3 px-3 py-2.5 bg-[#1a2d4a] border-l-[3px] border-brand rounded-lg text-xs text-text-primary">
              {bisetToast}
            </div>
          )}

          <WorkoutPrescriptionSummary
            items={exerciciosFicha}
            isMobile={true}
            className="mb-4"
          />

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">
              Exercícios <span className="text-brand">({exerciciosFicha.length})</span>
            </h2>
          </div>

          {exerciciosFicha.length === 0 ? (
            <div className="rounded-xl p-10 flex flex-col items-center text-center">
              <Barbell size={40} className="text-text-disabled mb-3" />
              <h3 className="text-sm font-semibold text-text-primary mb-1">
                Nenhum exercício na ficha
              </h3>
              <p className="text-xs text-text-tertiary mb-5">
                Adicione exercícios da biblioteca para montar o treino.
              </p>
              <button
                type="button"
                onClick={() => setModalExercicio(true)}
                className="btn-primary px-5 h-9 rounded-lg text-xs font-semibold"
              >
                Abrir biblioteca
              </button>
            </div>
          ) : (
            <>
              <ExerciseList {...exerciseListProps} />
              <button
                type="button"
                onClick={() => setModalExercicio(true)}
                className="mt-3 mb-1 w-full h-11 inline-flex items-center justify-center gap-1.5 rounded-xl text-brand text-xs font-semibold hover:bg-brand/5 transition-colors"
              >
                <Plus size={14} weight="bold" />
                Adicionar exercício
              </button>
            </>
          )}

          <WorkoutBuilderBottomBar
            saving={saving}
            canSave={canSave}
            isDirty={isDirty}
            saveLabel={isEdit ? "Salvar alterações" : "Salvar ficha"}
            onSave={handleSalvarFicha}
          />
        </div>
      )}

      {settingsOpen && (
        <WorkoutBuilderSettingsSheet
          alunos={alunos}
          alunoSelecionado={alunoSelecionado}
          alunoLocked={isEdit || alunoFromParam}
          onAlunoChange={(id) => {
            if (isEdit) return;
            setAlunoSelecionado(id);
            markDirty();
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {isBiSetPicking &&
        !isMobile &&
        libraryFloatRect &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Cancelar seleção do Bi-Set"
              onClick={cancelBiSetPartnerPick}
              className="fixed inset-0 z-[100] border-0 cursor-default bg-black/75"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Selecionar exercício B do Bi-Set"
              className="fixed z-[110] rounded-2xl overflow-hidden bg-surface-1 ring-2 ring-brand shadow-[0_0_60px_rgba(117, 27, 180,0.45)]"
              style={{
                top: libraryFloatRect.top,
                left: libraryFloatRect.left,
                width: libraryFloatRect.width,
                height: libraryFloatRect.height,
              }}
            >
              <LibraryPanel
                catalog={exerciciosCatalogo}
                existingIds={existingExerciseIds}
                pickMode
                pickExcludeId={biSetPickExcludeId}
                onAdd={handleAddFromLibrary}
              />
            </div>
          </>,
          document.body,
        )}

      {isMobile && modalExercicio && (
        <ExerciseLibraryModal
          catalog={exerciciosCatalogo}
          existingIds={existingExerciseIds}
          pickMode={isBiSetPicking}
          pickExcludeId={biSetPickExcludeId}
          onClose={() => {
            if (isBiSetPicking) cancelBiSetPartnerPick();
            else setModalExercicio(false);
          }}
          onAdd={handleAddFromLibrary}
          onCreateNew={
            isBiSetPicking
              ? undefined
              : () => {
                  setModalExercicio(false);
                  setModalNovoExercicio(true);
                }
          }
        />
      )}

      {modalNovoExercicio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-surface-0/80 backdrop-blur-sm">
          <div className="bg-surface-1 border-0 w-full max-w-lg rounded-xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-divider flex justify-between items-center">
              <h3 className="text-sm font-bold">Criar exercício</h3>
              <button
                type="button"
                onClick={() => {
                  setModalNovoExercicio(false);
                  setErroValidacao(null);
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {erroValidacao && (
                <div className="p-2.5 bg-danger-subtle border border-danger-border rounded-lg flex gap-2 text-xs text-danger">
                  <WarningCircle size={14} className="shrink-0" />
                  {erroValidacao}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-text-tertiary">Nome *</label>
                <input
                  type="text"
                  value={novoExercicioForm.nome}
                  onChange={(e) =>
                    setNovoExercicioForm({ ...novoExercicioForm, nome: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-text-tertiary">
                  Grupo muscular *
                </label>
                <input
                  type="text"
                  value={novoExercicioForm.grupo_muscular}
                  onChange={(e) =>
                    setNovoExercicioForm({
                      ...novoExercicioForm,
                      grupo_muscular: e.target.value,
                    })
                  }
                  className={inputCls}
                  placeholder="Ex: Peito Médio"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-text-tertiary">
                  Equipamento *
                </label>
                <select
                  value={novoExercicioForm.equipamento}
                  onChange={(e) =>
                    setNovoExercicioForm({
                      ...novoExercicioForm,
                      equipamento: e.target.value,
                    })
                  }
                  className={selectCls}
                >
                  <option value="">Selecione...</option>
                  {EQUIPAMENTOS.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-text-tertiary">Tipo *</label>
                <select
                  value={novoExercicioForm.tipo_exercicio}
                  onChange={(e) =>
                    setNovoExercicioForm({
                      ...novoExercicioForm,
                      tipo_exercicio: e.target.value,
                    })
                  }
                  className={selectCls}
                >
                  <option value="">Selecione...</option>
                  {TIPOS_EXERCICIO.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2">
              <button
                type="button"
                onClick={() => setModalNovoExercicio(false)}
                className="flex-1 h-9 bg-surface-3 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={criarNovoExercicio}
                className="flex-1 h-9 bg-brand text-text-on-brand rounded-lg text-xs font-semibold"
              >
                Criar e adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
