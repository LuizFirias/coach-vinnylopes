"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  Plus,
  Trash,
  X,
  MagnifyingGlass,
  CaretRight,
  Barbell,
  WarningCircle,
  CircleNotch,
} from "@phosphor-icons/react";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { useAuth } from "@/app/components/AuthProvider";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { cn } from "@/lib/utils/cn";
import { textIncludes } from "@/lib/utils/textNormalize";
import { readReturnUrl } from "@/lib/utils/adminNav";
import { WorkoutBuilderHeader } from "@/app/components/workout-builder/WorkoutBuilderHeader";
import { WorkoutBuilderBottomBar } from "@/app/components/workout-builder/WorkoutBuilderBottomBar";
import { WorkoutBuilderSettingsSheet } from "@/app/components/workout-builder/WorkoutBuilderSettingsSheet";
import { ExerciseList } from "@/app/components/workout-builder/ExerciseList";
import { WorkoutPrescriptionSummary } from "@/app/components/workout-builder/WorkoutPrescriptionSummary";
import type { ExercicioFicha, SerieDefinicao } from "@/app/components/workout-builder/types";
import { TIPOS_EXERCICIO } from "@/app/components/workout-builder/exerciseColumns";
import type { ExercicioFichaItem } from "@/lib/utils/biset";
import {
  serializeFichaItems,
  simpleToBiSetGroup,
  bisetGroupToSimples,
  halfFromCatalog,
  validateBiSetGroup,
  isBiSetFichaItem,
} from "@/lib/utils/biset";

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
  video_url?: string;
}

const EQUIPAMENTOS = ["Nenhum", "Banda de Resistência", "Banda de Suspensão", "Barra", "Disco de Peso", "Haltere", "Kettlebell", "Máquina", "Outro"];

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

export default function NovaFichaCoachPage() {
  const router = useRouter();
  const { user, userRole, loading: authLoading } = useAuth();
  const isMobile = useBreakpoint("mobile");

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [exerciciosCatalogo, setExerciciosCatalogo] = useState<Exercicio[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState("");
  const [nomeRotina, setNomeRotina] = useState("");
  const [exerciciosFicha, setExerciciosFicha] = useState<ExercicioFichaItem[]>([]);
  const [bisetToast, setBisetToast] = useState<string | null>(null);
  const [modalExercicio, setModalExercicio] = useState(false);
  const [modalNovoExercicio, setModalNovoExercicio] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(new Set());
  const [novoExercicioForm, setNovoExercicioForm] = useState({
    nome: "", grupo_muscular: "", descricao: "", video_url: "", equipamento: "", tipo_exercicio: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [dragHint, setDragHint] = useState<string | null>(null);

  const markDirty = useCallback(() => setIsDirty(true), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const param = params.get("alunoId");
    if (param) setAlunoSelecionado(param);
  }, []);

  const fallbackReturn = "/admin/treinos";
  const goBack = useCallback(() => {
    const target = readReturnUrl(window.location.search, fallbackReturn);
    router.push(target);
  }, [router]);

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
        .from("exercicios_biblioteca").select("id, nome, grupo_muscular, tipo_exercicio, video_url")
        .order("nome", { ascending: true });
      setExerciciosCatalogo(exerciciosData || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }, [router, userRole]);

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
    setExerciciosFicha((prev) => [...prev, exercicioFromCatalog(ex)]);
    markDirty();
    setModalExercicio(false);
  };

  const toggleSelectExercise = (id: string) => {
    setSelectedExerciseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelectedExercises = () => {
    if (selectedExerciseIds.size === 0) {
      setModalExercicio(false);
      return;
    }
    const novos: ExercicioFicha[] = [];
    selectedExerciseIds.forEach((id) => {
      const ex = exerciciosCatalogo.find((e) => e.id === id);
      if (ex) novos.push(exercicioFromCatalog(ex));
    });
    setExerciciosFicha((prev) => [...prev, ...novos]);
    markDirty();
    setSelectedExerciseIds(new Set());
    setModalExercicio(false);
  };


  const duplicarExercicio = (index: number) => {
    setExerciciosFicha((prev) => {
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
    markDirty();
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
      series[serieIndex] = { ...series[serieIndex], [campo]: valor };
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

  const filteredExercicios = exerciciosCatalogo.filter((ex) =>
    textIncludes(ex.nome, searchTerm) ||
    textIncludes(ex.grupo_muscular, searchTerm)
  );

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

      const { error } = await supabaseClient.from("fichas_treino").insert({
        aluno_id: alunoSelecionado,
        coach_id: coachId,
        nome_rotina: nomeRotina.trim(),
        configuracao,
        ativo: true,
      });

      if (error) throw error;
      goBack();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      alert("Erro ao salvar: " + message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportarPDF = async () => {
    if (!alunoSelecionado || !nomeRotina.trim() || exerciciosFicha.length === 0) {
      alert("Preencha a ficha antes de exportar.");
      return;
    }

    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const coachId = user?.id;
      if (!coachId) throw new Error("Sessão inválida");

      const alunoData = alunos.find((a) => a.id === alunoSelecionado);
      const nomeAluno = alunoData?.coaching_reference || alunoData?.email || "Aluno";

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      doc.setFontSize(20);
      doc.text("FICHA DE TREINO", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text(nomeRotina, 105, 28, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Atleta: ${nomeAluno}`, 20, 40);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 20, 46);
      doc.line(20, 50, 190, 50);

      let currentY = 58;

      exerciciosFicha.forEach((item, index) => {
        if (currentY > 250) { doc.addPage(); currentY = 20; }

        const renderExercisePdf = (nome: string, series: SerieDefinicao[]) => {
          doc.setFontSize(12);
          doc.text(`${index + 1}. ${nome}`, 20, currentY);
          currentY += 6;
          const hasPeso = series.some((s) => s.peso_sugerido != null && s.peso_sugerido > 0);
          const hasTecnica = series.some((s) => !!s.tecnica?.trim());
          const hasTecnicaExtra = series.some((s) => !!s.tecnica_extra?.trim());
          const tableData = series.map((serie) => {
            const row: (string | number)[] = [serie.ordem, serie.reps_sugerido || "-"];
            if (hasPeso) row.push(serie.peso_sugerido != null ? `${serie.peso_sugerido}kg` : "-");
            if (hasTecnica) row.push(serie.tecnica || "-");
            if (hasTecnicaExtra) row.push(serie.tecnica_extra || "-");
            return row;
          });
          const headers = ["Série", "Reps"];
          if (hasPeso) headers.push("kg");
          if (hasTecnica) headers.push("TÉC");
          if (hasTecnicaExtra) headers.push("Técnica Extra");
          autoTable(doc, {
            startY: currentY,
            head: [headers],
            body: tableData,
            theme: "grid",
            headStyles: { fillColor: [43, 127, 255], textColor: [255, 255, 255], fontSize: 9 },
            bodyStyles: { fontSize: 9 },
            margin: { left: 20 },
            tableWidth: 170,
          });
          currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
        };

        if (isBiSetFichaItem(item) && item.exercicioB) {
          doc.setFontSize(11);
          doc.text(`[BI-SET] ${item.exercicioA.nome} + ${item.exercicioB.nome}`, 20, currentY);
          currentY += 8;
          renderExercisePdf(item.exercicioA.nome, item.exercicioA.series);
          renderExercisePdf(item.exercicioB.nome, item.exercicioB.series);
        } else if (!isBiSetFichaItem(item)) {
          renderExercisePdf(item.nome, item.series);
        }
      });

      const pdfBlob = doc.output("blob");
      const fileName = `${alunoSelecionado}/${Date.now()}_${nomeRotina.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

      const { error: uploadError } = await supabaseClient.storage
        .from("treinos-pdf").upload(fileName, pdfBlob, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabaseClient.from("treinos_alunos").insert({
        aluno_id: alunoSelecionado,
        coach_id: coachId,
        url_pdf: fileName,
        nome_arquivo: `${nomeRotina}.pdf`,
        data_upload: new Date().toISOString(),
      });

      if (dbError) throw dbError;
      alert("PDF exportado com sucesso e salvo no acervo do atleta!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      alert("Erro ao exportar PDF: " + message);
    } finally {
      setExporting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Preparando ambiente..." />
      </div>
    );
  }

  const canSave = !!alunoSelecionado && !!nomeRotina.trim() && exerciciosFicha.length > 0;

  return (
    <div
      className={cn(
        "min-h-screen bg-surface-0 lg:pl-28",
        isMobile
          ? "pb-[calc(5rem+env(safe-area-inset-bottom))]"
          : "pb-12 p-4 md:p-6"
      )}
    >
      <div className="max-w-4xl mx-auto px-4 md:px-0">
        <WorkoutBuilderHeader
          isMobile={isMobile}
          alunos={alunos}
          alunoSelecionado={alunoSelecionado}
          nomeRotina={nomeRotina}
          saving={saving}
          exporting={exporting}
          canSave={canSave}
          isDirty={isDirty}
          onBack={goBack}
          onAlunoChange={(id) => { setAlunoSelecionado(id); markDirty(); }}
          onRotinaChange={(n) => { setNomeRotina(n); markDirty(); }}
          onSave={handleSalvarFicha}
          onExportPdf={!isMobile ? handleExportarPDF : undefined}
          onOpenSettings={() => setSettingsOpen(true)}
        />

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
          isMobile={isMobile}
          className="mb-4"
        />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">
            Exercícios <span className="text-brand">({exerciciosFicha.length})</span>
          </h2>
          {!isMobile && (
            <button
              type="button"
              onClick={() => setModalExercicio(true)}
              className="inline-flex items-center gap-1.5 px-3 h-8 bg-surface-1 border-0 text-text-secondary rounded-lg text-xs font-semibold hover:text-brand hover:border-brand/30"
            >
              <Plus size={14} weight="bold" /> Adicionar exercício
            </button>
          )}
        </div>

        {exerciciosFicha.length === 0 ? (
          <div className="bg-surface-1 border border-dashed border-divider rounded-xl p-10 flex flex-col items-center text-center">
            <Barbell size={40} className="text-text-disabled mb-3" />
            <h3 className="text-sm font-semibold text-text-primary mb-1">Nenhum exercício na ficha</h3>
            <p className="text-xs text-text-tertiary mb-5">Adicione exercícios da biblioteca para montar o treino.</p>
            <button
              type="button"
              onClick={() => setModalExercicio(true)}
              className="px-5 h-9 bg-brand text-text-on-brand rounded-lg text-xs font-semibold"
            >
              Abrir biblioteca
            </button>
          </div>
        ) : (
          <>
          <ExerciseList
            items={exerciciosFicha}
            catalog={exerciciosCatalogo}
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
            onDeleteBiSet={removerGrupoBiSet}
          />
            <button
              type="button"
              onClick={() => setModalExercicio(true)}
              className="mt-3 mb-1 w-full h-11 inline-flex items-center justify-center gap-1.5 border border-dashed border-brand/40 rounded-xl text-brand text-xs font-semibold"
            >
              <Plus size={14} weight="bold" />
              Adicionar exercício
            </button>
          </>
        )}
      </div>

      {isMobile && (
        <WorkoutBuilderBottomBar
          saving={saving}
          exporting={exporting}
          canSave={canSave}
          isDirty={isDirty}
          onSave={handleSalvarFicha}
          onExportPdf={handleExportarPDF}
        />
      )}

      {settingsOpen && (
        <WorkoutBuilderSettingsSheet
          alunos={alunos}
          alunoSelecionado={alunoSelecionado}
          nomeRotina={nomeRotina}
          onAlunoChange={(id) => { setAlunoSelecionado(id); markDirty(); }}
          onRotinaChange={(n) => { setNomeRotina(n); markDirty(); }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Modal biblioteca */}
      {modalExercicio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-surface-0/80 backdrop-blur-sm">
          <div className="bg-surface-1 border-0 shadow-2xl w-full max-w-xl rounded-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-divider flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Biblioteca</h3>
                <p className="text-[10px] text-text-tertiary">Selecione exercícios para adicionar</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setModalExercicio(false); setModalNovoExercicio(true); }}
                  className="px-2.5 h-8 bg-brand text-text-on-brand rounded-lg text-xs font-semibold"
                >
                  + Novo
                </button>
                <button type="button" onClick={() => setModalExercicio(false)} className="w-8 h-8 bg-surface-3 rounded-lg flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Filtrar por nome ou grupo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 bg-surface-2 border-0 rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
              {filteredExercicios.map((ex) => {
                const isSelected = selectedExerciseIds.has(ex.id);
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => toggleSelectExercise(ex.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border text-left",
                      isSelected ? "border-brand bg-brand/5" : "border-transparent bg-surface-2"
                    )}
                  >
                    <div>
                      <p className={cn("text-xs font-bold", isSelected ? "text-brand" : "text-text-primary")}>{ex.nome}</p>
                      <p className="text-[9px] uppercase text-text-tertiary">{ex.grupo_muscular}</p>
                    </div>
                    {isSelected ? (
                      <span className="w-4 h-4 rounded-full bg-brand text-[9px] text-text-on-brand flex items-center justify-center">✓</span>
                    ) : (
                      <CaretRight size={14} className="text-text-tertiary" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="p-4 border-t border-divider flex justify-end gap-2">
              <button type="button" onClick={() => { setSelectedExerciseIds(new Set()); setModalExercicio(false); }} className="px-4 py-2 text-xs font-semibold rounded-lg bg-surface-3">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddSelectedExercises}
                disabled={selectedExerciseIds.size === 0}
                className="px-4 py-2 bg-brand disabled:opacity-40 text-text-on-brand rounded-lg text-xs font-semibold"
              >
                Adicionar ({selectedExerciseIds.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo exercício */}
      {modalNovoExercicio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-surface-0/80 backdrop-blur-sm">
          <div className="bg-surface-1 border-0 w-full max-w-lg rounded-xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-divider flex justify-between items-center">
              <h3 className="text-sm font-bold">Criar exercício</h3>
              <button type="button" onClick={() => { setModalNovoExercicio(false); setErroValidacao(null); }}>
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
                <input type="text" value={novoExercicioForm.nome} onChange={(e) => setNovoExercicioForm({ ...novoExercicioForm, nome: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-text-tertiary">Grupo muscular *</label>
                <input type="text" value={novoExercicioForm.grupo_muscular} onChange={(e) => setNovoExercicioForm({ ...novoExercicioForm, grupo_muscular: e.target.value })} className={inputCls} placeholder="Ex: Peito Médio" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-text-tertiary">Equipamento *</label>
                <select value={novoExercicioForm.equipamento} onChange={(e) => setNovoExercicioForm({ ...novoExercicioForm, equipamento: e.target.value })} className={selectCls}>
                  <option value="">Selecione...</option>
                  {EQUIPAMENTOS.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-text-tertiary">Tipo *</label>
                <select value={novoExercicioForm.tipo_exercicio} onChange={(e) => setNovoExercicioForm({ ...novoExercicioForm, tipo_exercicio: e.target.value })} className={selectCls}>
                  <option value="">Selecione...</option>
                  {TIPOS_EXERCICIO.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2">
              <button type="button" onClick={() => setModalNovoExercicio(false)} className="flex-1 h-9 bg-surface-3 rounded-lg text-xs font-semibold">Cancelar</button>
              <button type="button" onClick={criarNovoExercicio} className="flex-1 h-9 bg-brand text-text-on-brand rounded-lg text-xs font-semibold">Criar e adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
