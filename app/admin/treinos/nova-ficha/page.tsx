"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  Plus,
  Trash,
  X,
  MagnifyingGlass,
  CaretRight,
  FloppyDisk,
  Barbell,
  Clock,
  SquaresFour,
  User,
  ArrowLeft,
  WarningCircle,
  FileArrowDown,
  CircleNotch,
  LinkSimple,
} from "@phosphor-icons/react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { cn } from "@/lib/utils/cn";
import TimeInput from "@/app/components/TimeInput";

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

interface SerieDefinicao {
  ordem: number;
  peso_sugerido?: number;
  reps_sugerido?: string | number;
  tempo_sugerido?: string;
  distancia_sugerida?: number;
  tecnica?: string;
  tecnica_extra?: string;
}

interface ExercicioFicha {
  id: string;
  nome: string;
  tipo_exercicio: string;
  descanso: string;
  video_url: string;
  observacoes: string;
  series: SerieDefinicao[];
  biset_parceiro_id?: string;
}

const EQUIPAMENTOS = ["Nenhum", "Banda de Resistência", "Banda de Suspensão", "Barra", "Disco de Peso", "Haltere", "Kettlebell", "Máquina", "Outro"];

const TIPOS_EXERCICIO = ["Peso & Repetições", "Repetições", "Peso Corporal com Peso Acrescido", "Duração", "Duração e Peso", "Distância e Duração", "Peso e Distância"];

const TECNICAS_BASE = ["", "WS", "FS", "TS"];
const TECNICAS_EXTRA_OPCOES = ["", "Cluster Set", "Drop Set", "Bi-Set", "Super Set", "Repetições Parciais", "Isometria"];

const inputCls = "w-full bg-surface-2 border border-border-subtle text-text-primary px-3 py-2 rounded-lg text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors h-10";
const selectCls = "w-full bg-surface-2 border border-border-subtle text-text-primary px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-brand/40 transition-colors appearance-none h-10";

export default function NovaFichaCoachPage() {
  const router = useRouter();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [exerciciosCatalogo, setExerciciosCatalogo] = useState<Exercicio[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<string>("");
  const [nomeRotina, setNomeRotina] = useState<string>("");
  const [exerciciosFicha, setExerciciosFicha] = useState<ExercicioFicha[]>([]);
  const [modalExercicio, setModalExercicio] = useState<boolean>(false);
  const [modalNovoExercicio, setModalNovoExercicio] = useState<boolean>(false);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(new Set());
  const [novoExercicioForm, setNovoExercicioForm] = useState({
    nome: "", grupo_muscular: "", descricao: "", video_url: "", equipamento: "", tipo_exercicio: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(window.location.search).get("alunoId");
      if (param) setAlunoSelecionado(param);
    }
  }, []);

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

      const alunoIds = alunoLinks?.map(link => link.aluno_id) || [];
      let alunosData: any[] = [];
      if (alunoIds.length > 0) {
        const { data } = await supabaseClient
          .from("profiles").select("id, coaching_reference, email")
          .in("id", alunoIds).eq("arquivado", false)
          .order("coaching_reference", { ascending: true });
        alunosData = data || [];
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

  const criarSeriesPadrao = (tipo: string): SerieDefinicao[] => {
    const base = { ordem: 1 };
    switch (tipo) {
      case "Peso & Repetições":
      case "Peso Corporal com Peso Acrescido":
        return [1, 2, 3].map(o => ({ ...base, ordem: o, reps_sugerido: "12", tecnica: "", tecnica_extra: "" }));
      case "Repetições":
        return [1, 2, 3].map(o => ({ ...base, ordem: o, reps_sugerido: "12", tecnica: "", tecnica_extra: "" }));
      case "Duração":
        return [1, 2, 3].map(o => ({ ...base, ordem: o, tempo_sugerido: "01:00", tecnica: "", tecnica_extra: "" }));
      case "Duração e Peso":
        return [1, 2, 3].map(o => ({ ...base, ordem: o, tempo_sugerido: "01:00", tecnica: "", tecnica_extra: "" }));
      case "Distância e Duração":
        return [1, 2, 3].map(o => ({ ...base, ordem: o, tempo_sugerido: "01:00", tecnica: "", tecnica_extra: "" }));
      case "Peso e Distância":
        return [1, 2, 3].map(o => ({ ...base, ordem: o, reps_sugerido: "12", tecnica: "", tecnica_extra: "" }));
      default:
        return [1, 2, 3].map(o => ({ ...base, ordem: o, reps_sugerido: "12", tecnica: "", tecnica_extra: "" }));
    }
  };

  const adicionarExercicio = (ex: Exercicio) => {
    const tipoEx = ex.tipo_exercicio || "Peso & Repetições";
    const novo: ExercicioFicha = {
      id: ex.id,
      nome: ex.nome,
      tipo_exercicio: tipoEx,
      descanso: "01:00",
      video_url: ex.video_url || "",
      observacoes: "",
      series: criarSeriesPadrao(tipoEx),
    };
    setExerciciosFicha([...exerciciosFicha, novo]);
    setModalExercicio(false);
  };

  const toggleSelectExercise = (id: string) => {
    setSelectedExerciseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddSelectedExercises = () => {
    if (selectedExerciseIds.size === 0) {
      setModalExercicio(false);
      return;
    }

    const novos: ExercicioFicha[] = [];
    selectedExerciseIds.forEach(id => {
      const ex = exerciciosCatalogo.find((e: Exercicio) => e.id === id);
      if (ex) {
        const tipoEx = ex.tipo_exercicio || "Peso & Repetições";
        novos.push({
          id: ex.id,
          nome: ex.nome,
          tipo_exercicio: tipoEx,
          descanso: "01:00",
          video_url: ex.video_url || "",
          observacoes: "",
          series: criarSeriesPadrao(tipoEx),
        });
      }
    });

    setExerciciosFicha([...exerciciosFicha, ...novos]);
    setSelectedExerciseIds(new Set());
    setModalExercicio(false);
  };

  const removerExercicio = (index: number) => {
    setExerciciosFicha(exerciciosFicha.filter((_, i) => i !== index));
  };

  const atualizarExercicio = (index: number, campo: keyof ExercicioFicha, valor: any) => {
    const novos = [...exerciciosFicha];
    novos[index] = { ...novos[index], [campo]: valor };
    setExerciciosFicha(novos);
  };

  const atualizarSerie = (exIndex: number, serieIndex: number, campo: string, valor: any) => {
    const novos = [...exerciciosFicha];
    const series = [...novos[exIndex].series];
    (series[serieIndex] as any)[campo] = valor;
    novos[exIndex].series = series;
    setExerciciosFicha(novos);
  };

  const adicionarSerie = (exIndex: number) => {
    const novos = [...exerciciosFicha];
    const series = novos[exIndex].series;
    const proximaOrdem = series.length > 0 ? Math.max(...series.map(s => s.ordem)) + 1 : 1;
    const modelo = series[series.length - 1] || { reps_sugerido: "12", tempo_sugerido: "01:00", distancia_sugerida: 0, peso_sugerido: 0, tecnica: "", tecnica_extra: "" };
    novos[exIndex].series = [...series, { ...modelo, ordem: proximaOrdem }];
    setExerciciosFicha(novos);
  };

  const removerSerie = (exIndex: number, serieIndex: number) => {
    const novos = [...exerciciosFicha];
    const series = novos[exIndex].series.filter((_, i) => i !== serieIndex);
    novos[exIndex].series = series.map((s, i) => ({ ...s, ordem: i + 1 }));
    setExerciciosFicha(novos);
  };

  const filteredExercicios = exerciciosCatalogo.filter(ex =>
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

      setExerciciosCatalogo(prev => [data, ...prev].sort((a, b) => a.nome.localeCompare(b.nome)));
      adicionarExercicio(data);

      setNovoExercicioForm({
        nome: "", grupo_muscular: "", descricao: "", video_url: "", equipamento: "", tipo_exercicio: "",
      });
      setModalNovoExercicio(false);
    } catch (err: any) {
      console.error(err);
      setErroValidacao(err.message || "Erro ao salvar exercício.");
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
        exercicios: exerciciosFicha.map(ex => ({
          id: ex.id,
          nome: ex.nome,
          tipo_exercicio: ex.tipo_exercicio,
          descanso: ex.descanso,
          video_url: ex.video_url,
          observacoes: ex.observacoes,
          series: ex.series.map(s => ({
            ordem: s.ordem,
            peso: s.peso_sugerido ?? null,
            reps: s.reps_sugerido ?? null,
            tempo: s.tempo_sugerido ?? null,
            distancia: s.distancia_sugerida ?? null,
            tecnica: s.tecnica || null,
            tecnica_extra: s.tecnica_extra || null,
          })),
        })),
      };

      const { error } = await supabaseClient
        .from("fichas_treino")
        .insert({
          aluno_id: alunoSelecionado,
          coach_id: coachId,
          nome_rotina: nomeRotina.trim(),
          configuracao,
          ativo: true,
        });

      if (error) throw error;

      router.push("/admin/treinos");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar: " + err.message);
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

      const alunoData = alunos.find(a => a.id === alunoSelecionado);
      const nomeAluno = alunoData?.coaching_reference || alunoData?.email || "Aluno";

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text("FICHA DE TREINO", 105, 20, { align: "center" });

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(nomeRotina, 105, 28, { align: "center" });

      doc.setFontSize(10);
      doc.text(`Atleta: ${nomeAluno}`, 20, 40);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 20, 46);

      doc.setDrawColor(200, 200, 200);
      doc.line(20, 50, 190, 50);

      let currentY = 58;

      exerciciosFicha.forEach((ex, index) => {
        if (currentY > 250) { doc.addPage(); currentY = 20; }

        doc.setFontSize(12);
        doc.setTextColor(212, 175, 55);
        doc.text(`${index + 1}. ${ex.nome}`, 20, currentY);
        currentY += 6;

        if (ex.video_url) {
          doc.setFontSize(8);
          doc.setTextColor(70, 130, 180);
          doc.textWithLink("🎥 Vídeo demonstrativo", 20, currentY, { url: ex.video_url });
          currentY += 5;
        }

        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        if (ex.descanso) { doc.text(`Descanso: ${ex.descanso}`, 20, currentY); currentY += 5; }
        if (ex.observacoes) {
          const obsLines = doc.splitTextToSize(`Obs: ${ex.observacoes}`, 170);
          doc.text(obsLines, 20, currentY);
          currentY += (obsLines.length * 5);
        }

        const hasTecnica = ex.series.some(s => !!s.tecnica?.trim());
        const hasTecnicaExtra = ex.series.some(s => !!s.tecnica_extra?.trim());

        const tableData = ex.series.map((serie) => {
          const row: any[] = [serie.ordem, serie.reps_sugerido || "-"];
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
          headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontSize: 9, fontStyle: "bold" },
          bodyStyles: { fontSize: 9, textColor: [60, 60, 60] },
          margin: { left: 20 },
          tableWidth: 170
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      });

      const pdfBlob = doc.output("blob");
      const fileName = `${alunoSelecionado}/${Date.now()}_${nomeRotina.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

      const { error: uploadError } = await supabaseClient.storage
        .from("treinos-pdf")
        .upload(fileName, pdfBlob, { contentType: "application/pdf", cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabaseClient
        .from("treinos_alunos")
        .insert({
          aluno_id: alunoSelecionado,
          coach_id: coachId,
          url_pdf: fileName,
          nome_arquivo: `${nomeRotina}.pdf`,
          data_upload: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      alert("PDF exportado com sucesso e salvo no acervo do atleta!");
    } catch (err: any) {
      console.error(err);
      alert("Erro ao exportar PDF: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const getColunasPorTipo = (tipo: string) => {
    switch (tipo) {
      case "Peso & Repetições":
        return [
          { key: "reps_sugerido", label: "Reps", type: "text", placeholder: "12" }
        ];
      case "Repetições":
        return [
          { key: "reps_sugerido", label: "Reps", type: "text", placeholder: "12" }
        ];
      case "Peso Corporal com Peso Acrescido":
        return [
          { key: "reps_sugerido", label: "Reps", type: "text", placeholder: "12" }
        ];
      case "Duração":
        return [
          { key: "tempo_sugerido", label: "Tempo", type: "text", timeInput: true }
        ];
      case "Duração e Peso":
        return [
          { key: "tempo_sugerido", label: "Tempo", type: "text", timeInput: true }
        ];
      case "Distância e Duração":
        return [
          { key: "distancia_sugerida", label: "Dist. (m)", type: "number", placeholder: "0" },
          { key: "tempo_sugerido", label: "Tempo", type: "text", timeInput: true }
        ];
      case "Peso e Distância":
        return [
          { key: "distancia_sugerida", label: "Dist. (m)", type: "number", placeholder: "0" }
        ];
      default:
        return [
          { key: "reps_sugerido", label: "Reps", type: "text", placeholder: "12" }
        ];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Preparando ambiente..." />
      </div>
    );
  }

  const canSave = !!alunoSelecionado && !!nomeRotina && exerciciosFicha.length > 0;

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:pl-28 pb-24">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6 py-4 border-b border-border-subtle flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/treinos')}
              className="w-9 h-9 rounded-lg bg-surface-1 border border-border-subtle flex items-center justify-center text-text-tertiary hover:text-brand hover:border-brand/20 transition-all shadow-sm"
              title="Voltar para treinos"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">
                Nova Ficha Digital
              </h1>
              <p className="text-xs text-text-secondary">Monte o treino personalizado de alta fidelidade</p>
            </div>
          </div>
        </div>

        {/* Global Settings Card */}
        <div className="bg-surface-1 border border-border-subtle shadow-sm rounded-xl p-4 md:p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                <User className="w-3.5 h-3.5" /> Aluno
              </label>
              <select
                value={alunoSelecionado}
                onChange={(e) => setAlunoSelecionado(e.target.value)}
                className={selectCls}
              >
                <option value="">Selecione o atleta...</option>
                {alunos.map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>{aluno.coaching_reference}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                <SquaresFour className="w-3.5 h-3.5" /> Título da Rotina
              </label>
              <input
                type="text"
                value={nomeRotina}
                onChange={(e) => setNomeRotina(e.target.value)}
                placeholder="Ex: Treino A - Superior Foco Deltoide"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Exercises Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3.5 px-1">
            <h2 className="text-sm font-bold text-text-primary">
              Exercícios <span className="text-brand">({exerciciosFicha.length})</span>
            </h2>
            <button
              onClick={() => setModalExercicio(true)}
              className="flex items-center gap-1.5 px-3 h-8 bg-surface-1 border border-border-subtle shadow-sm text-text-secondary rounded-lg text-xs font-semibold hover:text-brand hover:border-brand/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" weight="bold" /> Adicionar
            </button>
          </div>

          <div className="space-y-3">
            {exerciciosFicha.map((exercicio, exIndex) => (
              <div key={exIndex} className="bg-surface-1 border border-border-subtle shadow-sm rounded-xl p-4 md:p-5">
                {/* Exercise Header */}
                <div className="flex flex-col md:flex-row gap-3 mb-4 pb-3 border-b border-border-subtle/50">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Exercício</label>
                    <input
                      type="text"
                      value={exercicio.nome}
                      onChange={(e) => atualizarExercicio(exIndex, "nome", e.target.value)}
                      className="w-full text-sm font-bold text-text-primary bg-transparent border-none p-0 focus:ring-0 focus:outline-none"
                    />
                  </div>
                  <div className="w-full md:w-28 space-y-1">
                    <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                      <Clock className="w-3 h-3" /> Descanso
                    </label>
                    <TimeInput
                      value={exercicio.descanso}
                      onChange={(v) => atualizarExercicio(exIndex, "descanso", v)}
                      className="w-full px-2.5 py-1.5 bg-surface-2 border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-brand/40"
                    />
                  </div>
                  <button
                    onClick={() => removerExercicio(exIndex)}
                    className="self-end w-8 h-8 flex items-center justify-center bg-danger/10 border border-danger/20 text-danger rounded-lg hover:opacity-80 transition-opacity"
                    title="Excluir exercício"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>

                {/* Observações */}
                <div className="space-y-1 mb-3 pb-3 border-b border-border-subtle/50">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Observações para o Aluno</label>
                  <textarea
                    value={exercicio.observacoes}
                    onChange={(e) => atualizarExercicio(exIndex, "observacoes", e.target.value)}
                    placeholder="Ex: Manter o core contraído, não arquear as costas..."
                    className="w-full px-3 py-2 bg-surface-2 border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-brand/40 resize-none min-h-13"
                    rows={2}
                  />
                </div>

                {/* Bi-Set partner selector — aparece quando qualquer série tem técnica Bi-Set */}
                {exercicio.series.some(s => s.tecnica_extra === 'Bi-Set') && (
                  <div className="mb-3 pb-3 border-b border-border-subtle/50 flex flex-col gap-1.5 w-full">
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand">
                      <LinkSimple className="w-3.5 h-3.5" weight="bold" /> Parceiro Bi-Set
                    </label>
                    <select
                      value={exercicio.biset_parceiro_id || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExerciciosFicha(prev => prev.map((ex, i) =>
                          i !== exIndex ? ex : { ...ex, biset_parceiro_id: val || undefined }
                        ));
                      }}
                      className="w-full min-w-0 truncate h-9 px-2.5 bg-surface-0 border border-brand/30 rounded-md text-xs text-text-primary focus:outline-none"
                    >
                      <option value="">— Selecionar exercício parceiro —</option>
                      {exerciciosFicha
                        .filter((_, i) => i !== exIndex)
                        .map((partnerEx) => (
                          <option key={partnerEx.id} value={partnerEx.id}>{partnerEx.nome}</option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Series Table */}
                <div className="space-y-2">
                  {(() => {
                    const baseCols = getColunasPorTipo(exercicio.tipo_exercicio);
                    const temIsometria = exercicio.series.some(s => s.tecnica_extra === "Isometria");
                    const colunas = temIsometria
                      ? baseCols.map(c => c.key === 'reps_sugerido' ? { key: 'tempo_sugerido', label: 'Tempo', type: 'text', timeInput: true } : c)
                      : baseCols;
                    // Linha compacta única (mesma densidade em mobile e desktop) — Fase 4
                    const gridTemplate = `1.5rem ${colunas.map(() => 'minmax(0,1fr)').join(' ')} 2.75rem minmax(0,1.3fr) 1.25rem`;
                    return (
                      <>
                        <div>
                          {/* Header row */}
                          <div className="grid gap-1.5 px-1.5 mb-1" style={{ gridTemplateColumns: gridTemplate }}>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary">#</span>
                            {colunas.map((col) => (
                              <span key={col.key} className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary truncate">{col.label}</span>
                            ))}
                            <span className="text-[9px] font-bold uppercase tracking-wider text-brand/70 truncate">TÉC</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-brand/70 truncate">Extra</span>
                            <span></span>
                          </div>

                          {exercicio.series.map((serie, sIndex) => (
                            <div key={sIndex} className="grid gap-1.5 items-center bg-surface-2 border border-border-subtle/50 px-1.5 py-1 rounded-lg mb-1" style={{ gridTemplateColumns: gridTemplate }}>
                              <div className="flex items-center justify-center text-xs font-bold text-text-secondary">{serie.ordem}</div>
                              {colunas.map((col) =>
                                col.type === 'select' ? (
                                  <select
                                    key={col.key}
                                    value={(serie as any)[col.key] ?? ''}
                                    onChange={(e) => atualizarSerie(exIndex, sIndex, col.key, e.target.value)}
                                    className="w-full h-7 px-1 bg-surface-0 border border-border-subtle rounded-md text-xs text-text-primary focus:outline-none"
                                  >
                                    {(col as any).options?.map((opt: string) => <option key={opt} value={opt}>{opt || '-'}</option>)}
                                  </select>
                                ) : (col as any).timeInput ? (
                                  <TimeInput
                                    key={col.key}
                                    value={(serie as any)[col.key] ?? '00:00'}
                                    onChange={(v) => atualizarSerie(exIndex, sIndex, col.key, v)}
                                    className="w-full h-7 px-1 bg-surface-0 border border-border-subtle rounded-md text-xs text-text-primary focus:outline-none text-center"
                                  />
                                ) : (
                                  <input
                                    key={col.key}
                                    type={col.type}
                                    step={(col as any).step}
                                    placeholder={(col as any).placeholder}
                                    value={(serie as any)[col.key] ?? (col.type === 'number' ? 0 : '')}
                                    onChange={(e) => atualizarSerie(exIndex, sIndex, col.key, col.type === 'number' ? Number(e.target.value) : e.target.value)}
                                    className="w-full h-7 px-1 bg-surface-0 border border-border-subtle rounded-md text-xs text-text-primary focus:outline-none"
                                  />
                                )
                              )}
                              {/* TÉC */}
                              <select
                                value={(serie as any).tecnica ?? ''}
                                onChange={(e) => atualizarSerie(exIndex, sIndex, 'tecnica', e.target.value)}
                                className="w-full h-7 px-1 bg-surface-0 border border-border-subtle rounded-md text-xs text-text-secondary focus:outline-none"
                              >
                                {TECNICAS_BASE.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
                              </select>
                              {/* Técnica Extra */}
                              <select
                                value={(serie as any).tecnica_extra ?? ''}
                                onChange={(e) => atualizarSerie(exIndex, sIndex, 'tecnica_extra', e.target.value)}
                                className="w-full h-7 px-1 bg-surface-0 border border-border-subtle rounded-md text-xs text-text-secondary focus:outline-none"
                              >
                                {TECNICAS_EXTRA_OPCOES.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
                              </select>
                              <button onClick={() => removerSerie(exIndex, sIndex)} className="flex items-center justify-center text-text-tertiary hover:text-danger transition-colors">
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                      </>
                    );
                  })()}

                  <button
                    onClick={() => adicionarSerie(exIndex)}
                    className="w-full py-1.5 border border-dashed border-border-subtle rounded-lg text-text-disabled text-[10px] font-bold uppercase tracking-wider hover:bg-brand/5 hover:border-brand/30 hover:text-brand transition-all flex items-center justify-center gap-1.5"
                  >
                    + Adicionar Série
                  </button>
                </div>
              </div>
            ))}

            {exerciciosFicha.length === 0 && (
              <div className="bg-surface-1 border border-dashed border-border-subtle rounded-xl p-10 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-disabled mb-4">
                  <Barbell className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-text-primary mb-1">Nenhum exercício na ficha</h3>
                <p className="text-xs text-text-tertiary max-w-xs mb-6">Comece adicionando exercícios da biblioteca para o treino do atleta.</p>
                <button
                  onClick={() => setModalExercicio(true)}
                  className="px-5 h-9 bg-brand text-text-on-brand rounded-lg text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity"
                >
                  Abrir Biblioteca
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <button
            onClick={handleExportarPDF}
            disabled={exporting || !canSave}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 h-10 bg-surface-1 border border-border-subtle shadow-sm text-text-secondary rounded-lg text-xs font-semibold hover:text-brand hover:border-brand/20 transition-all disabled:opacity-50"
          >
            {exporting ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FileArrowDown className="w-4 h-4" />}
            {exporting ? "Exportando..." : "Exportar PDF"}
          </button>
          <button
            onClick={handleSalvarFicha}
            disabled={saving || !canSave}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 h-10 bg-brand text-text-on-brand rounded-lg text-xs font-semibold shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
            {saving ? "Salvando..." : "Publicar Ficha"}
          </button>
        </div>

        {/* Modal BIBLIOTECA */}
        {modalExercicio && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-surface-0/80 backdrop-blur-sm">
            <div className="bg-surface-1 border border-border-subtle shadow-2xl w-full max-w-xl rounded-xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Biblioteca</h3>
                  <p className="text-[10px] text-text-tertiary">Selecione o movimento para adicionar</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setModalExercicio(false); setModalNovoExercicio(true); }}
                    className="px-2.5 h-8 bg-brand text-text-on-brand rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    + Novo
                  </button>
                  <button onClick={() => setModalExercicio(false)} className="w-8 h-8 bg-surface-3 text-text-tertiary hover:text-danger rounded-lg flex items-center justify-center transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome ou grupo muscular..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-10 pl-9 pr-4 bg-surface-2 border border-border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
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
                        "w-full flex items-center justify-between p-3 rounded-lg border transition-all group",
                        isSelected 
                          ? "border-brand bg-brand/5" 
                          : "border-border-subtle bg-surface-2 hover:border-brand/30 hover:bg-brand-subtle/40"
                      )}
                    >
                      <div className="text-left">
                        <p className={cn("text-xs font-bold transition-colors", isSelected ? "text-brand" : "text-text-primary group-hover:text-brand")}>{ex.nome}</p>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary mt-0.5">{ex.grupo_muscular}</p>
                      </div>
                      {isSelected ? (
                        <span className="w-4 h-4 rounded-full bg-brand flex items-center justify-center text-[9px] text-text-on-brand font-bold">✓</span>
                      ) : (
                        <CaretRight className="w-3.5 h-3.5 text-text-tertiary group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                      )}
                    </button>
                  );
                })}
                {filteredExercicios.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-xs text-text-tertiary">Nenhum exercício encontrado</p>
                  </div>
                )}
              </div>

              {/* Modal Footer with Add Button */}
              <div className="p-4 border-t border-border-subtle bg-surface-2/40 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { setSelectedExerciseIds(new Set()); setModalExercicio(false); }}
                  className="px-4 py-2 bg-surface-3 hover:bg-surface-4 text-text-primary rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddSelectedExercises}
                  disabled={selectedExerciseIds.size === 0}
                  className="px-4 py-2 bg-brand disabled:opacity-40 text-text-on-brand rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Adicionar ({selectedExerciseIds.size})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal NOVO EXERCÍCIO */}
        {modalNovoExercicio && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-surface-0/80 backdrop-blur-sm">
            <div className="bg-surface-1 border border-border-subtle shadow-2xl w-full max-w-lg rounded-xl overflow-hidden max-h-[85vh] flex flex-col">
              <div className="p-4 border-b border-border-subtle flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Criar Novo Exercício</h3>
                  <p className="text-[10px] text-text-tertiary">Adicione à biblioteca e à ficha</p>
                </div>
                <button onClick={() => { setModalNovoExercicio(false); setErroValidacao(null); }} className="w-8 h-8 bg-surface-3 text-text-tertiary hover:text-danger rounded-lg flex items-center justify-center transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-4 space-y-4">
                {erroValidacao && (
                  <div className="p-2.5 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-2.5">
                    <WarningCircle className="text-danger mt-0.5 flex-shrink-0 w-3.5 h-3.5" />
                    <p className="text-danger text-xs font-semibold">{erroValidacao}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Nome do Exercício *</label>
                  <input
                    type="text"
                    value={novoExercicioForm.nome}
                    onChange={(e) => setNovoExercicioForm({...novoExercicioForm, nome: e.target.value})}
                    placeholder="Ex: Supino Inclinado"
                    className={inputCls}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Grupo Muscular *</label>
                  <select
                    value={novoExercicioForm.grupo_muscular}
                    onChange={(e) => setNovoExercicioForm({...novoExercicioForm, grupo_muscular: e.target.value})}
                    className={selectCls}
                  >
                    <option value="">Selecione...</option>
                    <optgroup label="Peito">
                      <option value="Peito Superior">Peito Superior</option>
                      <option value="Peito Médio">Peito Médio</option>
                      <option value="Peito Inferior">Peito Inferior</option>
                    </optgroup>
                    <optgroup label="Costas">
                      <option value="Dorsais">Dorsais</option>
                      <option value="Trapézio">Trapézio</option>
                      <option value="Lombar">Lombar</option>
                    </optgroup>
                    <optgroup label="Ombros">
                      <option value="Ombro Anterior">Ombro Anterior</option>
                      <option value="Ombro Lateral">Ombro Lateral</option>
                      <option value="Ombro Posterior">Ombro Posterior</option>
                    </optgroup>
                    <optgroup label="Braços">
                      <option value="Bíceps">Bíceps</option>
                      <option value="Tríceps">Tríceps</option>
                      <option value="Antebraço">Antebraço</option>
                    </optgroup>
                    <optgroup label="Pernas">
                      <option value="Quadríceps">Quadríceps</option>
                      <option value="Posterior (Isquiotibiais)">Posterior (Isquiotibiais)</option>
                      <option value="Panturrilha">Panturrilha</option>
                      <option value="Glúteos">Glúteos</option>
                    </optgroup>
                    <optgroup label="Core">
                      <option value="Abdômen">Abdômen</option>
                      <option value="Oblíquos">Oblíquos</option>
                    </optgroup>
                    <option value="Cárdio">Cárdio</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Equipamento *</label>
                  <select
                    value={novoExercicioForm.equipamento}
                    onChange={(e) => setNovoExercicioForm({...novoExercicioForm, equipamento: e.target.value})}
                    className={selectCls}
                  >
                    <option value="">Selecione...</option>
                    {EQUIPAMENTOS.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Tipo de Exercício *</label>
                  <select
                    value={novoExercicioForm.tipo_exercicio}
                    onChange={(e) => setNovoExercicioForm({...novoExercicioForm, tipo_exercicio: e.target.value})}
                    className={selectCls}
                  >
                    <option value="">Selecione...</option>
                    {TIPOS_EXERCICIO.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Vídeo YouTube (opcional)</label>
                  <input
                    type="text"
                    value={novoExercicioForm.video_url}
                    onChange={(e) => setNovoExercicioForm({...novoExercicioForm, video_url: e.target.value})}
                    placeholder="youtu.be/ID ou youtube.com/watch?v=ID"
                    className={inputCls}
                  />
                  <p className="text-[10px] text-text-disabled ml-1 mt-0.5">Cole a URL completa ou apenas o ID do vídeo.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Descrição</label>
                  <textarea
                    value={novoExercicioForm.descricao}
                    onChange={(e) => setNovoExercicioForm({...novoExercicioForm, descricao: e.target.value})}
                    placeholder="Ex: Exercício para o desenvolvimento de peito..."
                    className="w-full bg-surface-2 border border-border-subtle text-text-primary px-3 py-2 rounded-lg text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors resize-none h-14 py-1.5"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex gap-3 p-4 border-t border-border-subtle flex-shrink-0">
                <button
                  onClick={() => { setModalNovoExercicio(false); setErroValidacao(null); }}
                  className="flex-1 h-9 bg-surface-3 border border-border-subtle text-text-secondary rounded-lg text-xs font-semibold hover:text-text-primary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={criarNovoExercicio}
                  className="flex-1 h-9 bg-brand text-text-on-brand rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Criar e Adicionar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
