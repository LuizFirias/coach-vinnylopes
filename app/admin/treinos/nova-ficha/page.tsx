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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { cn } from "@/lib/utils/cn";
import { WorkoutBuilderHeader } from "@/app/components/workout-builder/WorkoutBuilderHeader";
import { WorkoutBuilderBottomBar } from "@/app/components/workout-builder/WorkoutBuilderBottomBar";
import { WorkoutBuilderSettingsSheet } from "@/app/components/workout-builder/WorkoutBuilderSettingsSheet";
import { ExerciseList } from "@/app/components/workout-builder/ExerciseList";
import { WorkoutPrescriptionSummary } from "@/app/components/workout-builder/WorkoutPrescriptionSummary";
import type { ExercicioFicha, SerieDefinicao } from "@/app/components/workout-builder/types";
import { TIPOS_EXERCICIO } from "@/app/components/workout-builder/exerciseColumns";

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

const inputCls = "w-full bg-surface-2 border border-border-subtle text-text-primary px-3 py-2 rounded-lg text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors h-10";
const selectCls = "w-full bg-surface-2 border border-border-subtle text-text-primary px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-brand/40 transition-colors appearance-none h-10";

function criarSeriesPadrao(tipo: string): SerieDefinicao[] {
  const base = { ordem: 1, tecnica: "", tecnica_extra: "" };
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
  const isMobile = useBreakpoint("mobile");

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [exerciciosCatalogo, setExerciciosCatalogo] = useState<Exercicio[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState("");
  const [nomeRotina, setNomeRotina] = useState("");
  const [exerciciosFicha, setExerciciosFicha] = useState<ExercicioFicha[]>([]);
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
    loadData();
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("alunoId");
      if (param) setAlunoSelecionado(param);
      if (!localStorage.getItem("workout_builder_drag_hint") && exerciciosFicha.length > 1) {
        setDragHint("Segure o ícone ⠿ e arraste para reordenar os exercícios");
        localStorage.setItem("workout_builder_drag_hint", "1");
        setTimeout(() => setDragHint(null), 5000);
      }
    }
  }, []);

  useEffect(() => {
    if (exerciciosFicha.length > 1 && typeof window !== "undefined" && !localStorage.getItem("workout_builder_drag_hint")) {
      setDragHint("Segure o ícone ⠿ e arraste para reordenar os exercícios");
      localStorage.setItem("workout_builder_drag_hint", "1");
      const t = setTimeout(() => setDragHint(null), 5000);
      return () => clearTimeout(t);
    }
  }, [exerciciosFicha.length]);

  const loadData = async () => {
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) { router.push("/login"); return; }

      const { data: profile } = await supabaseClient
        .from("profiles").select("role").eq("id", userId).single();

      if (profile?.role !== "coach" && profile?.role !== "super_admin") {
        router.push("/aluno/dashboard"); return;
      }

      const { data: alunoLinks } = await supabaseClient
        .from("coach_alunos").select("aluno_id").eq("coach_id", userId);

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

  const removerExercicio = (index: number) => {
    setExerciciosFicha((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  };

  const atualizarExercicio = (index: number, patch: Partial<ExercicioFicha>) => {
    setExerciciosFicha((prev) => {
      const novos = [...prev];
      novos[index] = { ...novos[index], ...patch };
      return novos;
    });
    markDirty();
  };

  const atualizarSerie = (exIndex: number, serieIndex: number, campo: string, valor: unknown) => {
    setExerciciosFicha((prev) => {
      const novos = [...prev];
      const series = [...novos[exIndex].series];
      series[serieIndex] = { ...series[serieIndex], [campo]: valor };
      novos[exIndex] = { ...novos[exIndex], series };
      return novos;
    });
    markDirty();
  };

  const adicionarSerie = (exIndex: number) => {
    setExerciciosFicha((prev) => {
      const novos = [...prev];
      const series = novos[exIndex].series;
      const proximaOrdem = series.length > 0 ? Math.max(...series.map((s) => s.ordem)) + 1 : 1;
      const modelo = series[series.length - 1] || { reps_sugerido: "12", tempo_sugerido: "01:00", tecnica: "", tecnica_extra: "" };
      novos[exIndex] = { ...novos[exIndex], series: [...series, { ...modelo, ordem: proximaOrdem }] };
      return novos;
    });
    markDirty();
  };

  const removerSerie = (exIndex: number, serieIndex: number) => {
    setExerciciosFicha((prev) => {
      const novos = [...prev];
      const series = novos[exIndex].series.filter((_, i) => i !== serieIndex).map((s, i) => ({ ...s, ordem: i + 1 }));
      novos[exIndex] = { ...novos[exIndex], series };
      return novos;
    });
    markDirty();
  };

  const filteredExercicios = exerciciosCatalogo.filter((ex) =>
    ex.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.grupo_muscular.toLowerCase().includes(searchTerm.toLowerCase())
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

    setSaving(true);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) throw new Error("Sessão expirada");

      const configuracao = {
        exercicios: exerciciosFicha.map((ex) => ({
          id: ex.id,
          nome: ex.nome,
          tipo_exercicio: ex.tipo_exercicio,
          descanso: ex.descanso,
          video_url: ex.video_url,
          observacoes: ex.observacoes,
          biset_parceiro_id: ex.biset_parceiro_id,
          series: ex.series.map((s) => ({
            ordem: s.ordem,
            reps: s.reps_sugerido ?? null,
            reps_sugerido: s.reps_sugerido ?? null,
            tempo: s.tempo_sugerido ?? null,
            tempo_sugerido: s.tempo_sugerido ?? null,
            distancia: s.distancia_sugerida ?? null,
            distancia_sugerida: s.distancia_sugerida ?? null,
            tecnica: s.tecnica || null,
            tecnica_extra: s.tecnica_extra || null,
          })),
        })),
      };

      const { error } = await supabaseClient.from("fichas_treino").insert({
        aluno_id: alunoSelecionado,
        coach_id: coachId,
        nome_rotina: nomeRotina.trim(),
        configuracao,
        ativo: true,
      });

      if (error) throw error;
      router.push("/admin/treinos");
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
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
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

      exerciciosFicha.forEach((ex, index) => {
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(12);
        doc.text(`${index + 1}. ${ex.nome}`, 20, currentY);
        currentY += 6;

        const hasTecnica = ex.series.some((s) => !!s.tecnica?.trim());
        const hasTecnicaExtra = ex.series.some((s) => !!s.tecnica_extra?.trim());

        const tableData = ex.series.map((serie) => {
          const row: (string | number)[] = [serie.ordem, serie.reps_sugerido || "-"];
          if (hasTecnica) row.push(serie.tecnica || "-");
          if (hasTecnicaExtra) row.push(serie.tecnica_extra || "-");
          return row;
        });

        const headers = ["Série", "Reps"];
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

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Preparando ambiente..." />
      </div>
    );
  }

  const canSave = !!alunoSelecionado && !!nomeRotina.trim() && exerciciosFicha.length > 0;

  return (
    <div className={cn("min-h-screen bg-surface-0 lg:pl-28", isMobile ? "pb-28" : "pb-12 p-4 md:p-6")}>
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
          onBack={() => router.push("/admin/treinos")}
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

        <WorkoutPrescriptionSummary
          exercises={exerciciosFicha}
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
              className="inline-flex items-center gap-1.5 px-3 h-8 bg-surface-1 border border-border-subtle text-text-secondary rounded-lg text-xs font-semibold hover:text-brand hover:border-brand/30"
            >
              <Plus size={14} weight="bold" /> Adicionar exercício
            </button>
          )}
        </div>

        {exerciciosFicha.length === 0 ? (
          <div className="bg-surface-1 border border-dashed border-border-subtle rounded-xl p-10 flex flex-col items-center text-center">
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
          <ExerciseList
            exercises={exerciciosFicha}
            isMobile={isMobile}
            onReorder={handleReorder}
            onUpdate={atualizarExercicio}
            onDelete={removerExercicio}
            onAddSet={adicionarSerie}
            onUpdateSerie={atualizarSerie}
            onDeleteSerie={removerSerie}
          />
        )}
      </div>

      {isMobile && (
        <WorkoutBuilderBottomBar
          saving={saving}
          canSave={canSave}
          isDirty={isDirty}
          onSave={handleSalvarFicha}
          onAddExercise={() => setModalExercicio(true)}
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
          <div className="bg-surface-1 border border-border-subtle shadow-2xl w-full max-w-xl rounded-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
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
                  className="w-full h-10 pl-9 pr-4 bg-surface-2 border border-border-subtle rounded-lg text-xs"
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
                      isSelected ? "border-brand bg-brand/5" : "border-border-subtle bg-surface-2"
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
            <div className="p-4 border-t border-border-subtle flex justify-end gap-2">
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
          <div className="bg-surface-1 border border-border-subtle w-full max-w-lg rounded-xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-border-subtle flex justify-between items-center">
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
