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
  Video,
  Clock,
  SquaresFour,
  User,
  ArrowLeft,
  WarningCircle,
  FileArrowDown,
  CircleNotch,
} from "@phosphor-icons/react";
import { extractYouTubeVideoId, isValidYouTubeUrl } from "@/lib/youtubeUtils";
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
}

const EQUIPAMENTOS = ["Nenhum", "Banda de Resistência", "Banda de Suspensão", "Barra", "Disco de Peso", "Haltere", "Kettlebell", "Máquina", "Outro"];

const TIPOS_EXERCICIO = ["Peso & Repetições", "Repetições", "Peso Corporal com Peso Acrescido", "Duração", "Duração e Peso", "Distância e Duração", "Peso e Distância"];

const TECNICAS_BASE = ["", "WS", "FS", "TS"];
const TECNICAS_EXTRA_OPCOES = ["", "Cluster Set", "Drop Set", "Bi-Set", "Super Set", "Repetições Parciais", "Isometria"];

const inputCls = "w-full bg-surface-0 border border-border-subtle text-text-primary px-4 py-2.5 rounded-xl text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors";
const selectCls = "w-full bg-surface-0 border border-border-subtle text-text-primary px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-brand/40 transition-colors appearance-none";

export default function NovaFichaCoachPage() {
  const router = useRouter();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [exerciciosCatalogo, setExerciciosCatalogo] = useState<Exercicio[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<string>("");
  const [nomeRotina, setNomeRotina] = useState<string>("");
  const [exerciciosFicha, setExerciciosFicha] = useState<ExercicioFicha[]>([]);
  const [modalExercicio, setModalExercicio] = useState<boolean>(false);
  const [modalNovoExercicio, setModalNovoExercicio] = useState<boolean>(false);
  const [novoExercicioForm, setNovoExercicioForm] = useState({
    nome: "", grupo_muscular: "", descricao: "", video_url: "", equipamento: "", tipo_exercicio: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) { router.push("/login"); return; }

      const { data: profile } = await supabaseClient
        .from("profiles").select("role").eq("id", userId).single();

      if (profile?.role !== "coach" && profile?.role !== "admin") {
        router.push("/aluno/treinos"); return;
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
        return [1, 2, 3].map(o => ({ ...base, ordem: o, distancia_sugerida: 5, tempo_sugerido: "00:00", tecnica: "", tecnica_extra: "" }));
      case "Peso e Distância":
        return [1, 2, 3].map(o => ({ ...base, ordem: o, distancia_sugerida: 5, tecnica: "", tecnica_extra: "" }));
      default:
        return [1, 2, 3].map(o => ({ ...base, ordem: o, reps_sugerido: "12", tecnica: "", tecnica_extra: "" }));
    }
  };

  const adicionarExercicio = (exercicio: Exercicio) => {
    if (exerciciosFicha.some(ex => ex.id === exercicio.id)) {
      alert("Este exercício já foi adicionado à ficha"); return;
    }
    const tipoEx = exercicio.tipo_exercicio || "Peso & Repetições";
    const novoExercicio: ExercicioFicha = {
      id: exercicio.id, nome: exercicio.nome, tipo_exercicio: tipoEx,
      descanso: "01:30", video_url: exercicio.video_url || "",
      observacoes: "", series: criarSeriesPadrao(tipoEx),
    };
    setExerciciosFicha([...exerciciosFicha, novoExercicio]);
    setModalExercicio(false);
  };

  const criarNovoExercicio = async () => {
    if (!novoExercicioForm.nome || !novoExercicioForm.grupo_muscular || !novoExercicioForm.equipamento || !novoExercicioForm.tipo_exercicio) {
      alert("Preencha nome, grupo muscular, equipamento e tipo de exercício"); return;
    }
    if (novoExercicioForm.video_url.trim() && !isValidYouTubeUrl(novoExercicioForm.video_url)) {
      alert("URL do YouTube inválida. Use: youtu.be/ID ou youtube.com/watch?v=ID"); return;
    }
    try {
      const videoId = novoExercicioForm.video_url ? extractYouTubeVideoId(novoExercicioForm.video_url) : null;
      const res = await fetch("/api/admin/exercicios-biblioteca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novoExercicioForm.nome, grupo_muscular: novoExercicioForm.grupo_muscular,
          equipamento: novoExercicioForm.equipamento, tipo_exercicio: novoExercicioForm.tipo_exercicio,
          descricao: novoExercicioForm.descricao || null,
          video_url: videoId ? `https://youtube.com/embed/${videoId}` : null,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || payload?.details || "Falha ao criar exercício");
      const data = payload?.exercicio;
      if (!data?.id) throw new Error("Resposta inválida ao criar exercício");

      const novoExercicio: ExercicioFicha = {
        id: data.id, nome: data.nome, tipo_exercicio: novoExercicioForm.tipo_exercicio,
        descanso: "1:30", video_url: videoId ? `https://youtube.com/embed/${videoId}` : "",
        observacoes: "", series: criarSeriesPadrao(novoExercicioForm.tipo_exercicio),
      };
      setExerciciosFicha([...exerciciosFicha, novoExercicio]);
      setExerciciosCatalogo([...exerciciosCatalogo, data]);
      setNovoExercicioForm({ nome: "", grupo_muscular: "", descricao: "", video_url: "", equipamento: "", tipo_exercicio: "" });
      setModalNovoExercicio(false);
      setErroValidacao(null);
    } catch (err: any) {
      console.error("Erro ao criar exercício:", err);
      setErroValidacao("Erro ao criar exercício: " + err.message);
    }
  };

  const removerExercicio = (index: number) => {
    setExerciciosFicha(exerciciosFicha.filter((_, i) => i !== index));
  };

  const adicionarSerie = (exercicioIndex: number) => {
    const updated = [...exerciciosFicha];
    const exercicio = updated[exercicioIndex];
    const novaOrdem = exercicio.series.length + 1;
    const tipo = exercicio.tipo_exercicio;
    let novaSerie: SerieDefinicao = { ordem: novaOrdem };
    switch (tipo) {
      case "Peso & Repetições": case "Peso Corporal com Peso Acrescido":
        novaSerie = { ordem: novaOrdem, peso_sugerido: 0, reps_sugerido: 12, tecnica: "", tecnica_extra: "" }; break;
      case "Repetições": novaSerie = { ordem: novaOrdem, reps_sugerido: 12, tecnica: "", tecnica_extra: "" }; break;
      case "Duração": novaSerie = { ordem: novaOrdem, tempo_sugerido: "01:00", tecnica: "", tecnica_extra: "" }; break;
      case "Duração e Peso": novaSerie = { ordem: novaOrdem, tempo_sugerido: "01:00", peso_sugerido: 0, tecnica: "", tecnica_extra: "" }; break;
      case "Distância e Duração": novaSerie = { ordem: novaOrdem, distancia_sugerida: 5, tempo_sugerido: "00:00", tecnica: "", tecnica_extra: "" }; break;
      case "Peso e Distância": novaSerie = { ordem: novaOrdem, peso_sugerido: 0, distancia_sugerida: 5, tecnica: "", tecnica_extra: "" }; break;
      default: novaSerie = { ordem: novaOrdem, peso_sugerido: 0, reps_sugerido: 12, tecnica: "", tecnica_extra: "" };
    }
    updated[exercicioIndex].series.push(novaSerie);
    setExerciciosFicha(updated);
  };

  const removerSerie = (exercicioIndex: number, serieIndex: number) => {
    const updated = [...exerciciosFicha];
    updated[exercicioIndex].series = updated[exercicioIndex].series.filter((_, i) => i !== serieIndex);
    updated[exercicioIndex].series.forEach((s, i) => { s.ordem = i + 1; });
    setExerciciosFicha(updated);
  };

  const atualizarExercicio = (exercicioIndex: number, field: string, value: any) => {
    const updated = [...exerciciosFicha];
    (updated[exercicioIndex] as any)[field] = value;
    setExerciciosFicha(updated);
  };

  const atualizarSerie = (exercicioIndex: number, serieIndex: number, field: string, value: number | string) => {
    const updated = [...exerciciosFicha];
    (updated[exercicioIndex].series[serieIndex] as any)[field] = value;
    setExerciciosFicha(updated);
  };

  const getColunasPorTipo = (tipo: string) => {
    switch (tipo) {
      case "Peso & Repetições": case "Peso Corporal com Peso Acrescido": case "Repetições":
        return [
          { key: "reps_sugerido", label: "REPS", type: "text", placeholder: "12 ou 3x4" },
        ];
      case "Duração": case "Duração e Peso":
        return [
          { key: "tempo_sugerido", label: "TEMPO", type: "text", placeholder: "MM:SS", timeInput: true },
        ];
      case "Distância e Duração":
        return [
          { key: "distancia_sugerida", label: "KM", type: "number", step: "0.1" },
          { key: "tempo_sugerido", label: "TEMPO", type: "text", placeholder: "MM:SS", timeInput: true },
        ];
      case "Peso e Distância":
        return [
          { key: "distancia_sugerida", label: "KM", type: "number", step: "0.1" },
        ];
      default:
        return [
          { key: "reps_sugerido", label: "REPS", type: "text", placeholder: "12 ou 3x4" },
        ];
    }
  };

  const handleExportarPDF = async () => {
    if (!alunoSelecionado || !nomeRotina || exerciciosFicha.length === 0) {
      alert("Preencha os dados da ficha antes de exportar"); return;
    }
    setExporting(true);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) throw new Error('Sessão inválida');

      const { data: alunoData } = await supabaseClient
        .from('profiles').select('coaching_reference, email').eq('id', alunoSelecionado).single();
      const nomeAluno = alunoData?.coaching_reference || alunoData?.email || 'Aluno';

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFontSize(20); doc.setTextColor(40, 40, 40);
      doc.text('FICHA DE TREINO', 105, 20, { align: 'center' });
      doc.setFontSize(12); doc.setTextColor(100, 100, 100);
      doc.text(nomeRotina, 105, 28, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Atleta: ${nomeAluno}`, 20, 40);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 46);
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 50, 190, 50);

      let currentY = 58;
      exerciciosFicha.forEach((exercicio, index) => {
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        doc.setFontSize(12); doc.setTextColor(212, 175, 55);
        doc.text(`${index + 1}. ${exercicio.nome}`, 20, currentY); currentY += 6;
        if (exercicio.video_url) {
          doc.setFontSize(8); doc.setTextColor(70, 130, 180);
          doc.textWithLink('🎥 Vídeo demonstrativo', 20, currentY, { url: exercicio.video_url }); currentY += 5;
        }
        doc.setFontSize(9); doc.setTextColor(100, 100, 100);
        if (exercicio.descanso) { doc.text(`Descanso: ${exercicio.descanso}`, 20, currentY); currentY += 5; }
        if (exercicio.observacoes) {
          const obsLines = doc.splitTextToSize(`Obs: ${exercicio.observacoes}`, 170);
          doc.text(obsLines, 20, currentY); currentY += (obsLines.length * 5);
        }

        const hasTecnica = exercicio.series.some(s => !!(s as any).tecnica?.trim());
        const hasTecnicaExtra = exercicio.series.some(s => !!(s as any).tecnica_extra?.trim());
        const tableData = exercicio.series.map((serie) => {
          const row: any[] = [serie.ordem];
          switch (exercicio.tipo_exercicio) {
            case 'Peso & Repetições': case 'Peso Corporal com Peso Acrescido':
              row.push(serie.peso_sugerido ?? '-', serie.reps_sugerido ?? '-'); break;
            case 'Repetições': row.push(serie.reps_sugerido ?? '-'); break;
            case 'Duração': row.push(serie.tempo_sugerido || '-'); break;
            case 'Duração e Peso': row.push(serie.tempo_sugerido || '-', serie.peso_sugerido ?? '-'); break;
            case 'Distância e Duração': row.push(serie.distancia_sugerida ?? '-', serie.tempo_sugerido || '-'); break;
            case 'Peso e Distância': row.push(serie.peso_sugerido ?? '-', serie.distancia_sugerida ?? '-'); break;
            default: row.push(serie.peso_sugerido ?? '-', serie.reps_sugerido ?? '-');
          }
          if (hasTecnica) row.push((serie as any).tecnica || '-');
          if (hasTecnicaExtra) row.push((serie as any).tecnica_extra || '-');
          return row;
        });

        let headers: string[] = ['Série'];
        switch (exercicio.tipo_exercicio) {
          case 'Peso & Repetições': case 'Peso Corporal com Peso Acrescido': headers.push('Peso (kg)', 'Reps'); break;
          case 'Repetições': headers.push('Reps'); break;
          case 'Duração': headers.push('Tempo'); break;
          case 'Duração e Peso': headers.push('Tempo', 'Peso (kg)'); break;
          case 'Distância e Duração': headers.push('KM', 'Tempo'); break;
          case 'Peso e Distância': headers.push('Peso (kg)', 'KM'); break;
          default: headers.push('Peso (kg)', 'Reps');
        }
        if (hasTecnica) headers.push('TÉC');
        if (hasTecnicaExtra) headers.push('Técnica Extra');

        autoTable(doc, {
          startY: currentY, head: [headers], body: tableData, theme: 'grid',
          headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9, textColor: [60, 60, 60] },
          margin: { left: 20 }, tableWidth: 170,
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      });

      const pdfBlob = doc.output('blob');
      const fileName = `${alunoSelecionado}/${Date.now()}_${nomeRotina.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const { error: uploadError } = await supabaseClient.storage
        .from('treinos-pdf').upload(fileName, pdfBlob, { contentType: 'application/pdf', cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabaseClient.from('treinos_alunos').insert({
        aluno_id: alunoSelecionado, coach_id: coachId, url_pdf: fileName,
        nome_arquivo: `${nomeRotina}.pdf`, data_upload: new Date().toISOString(),
      });
      if (dbError) throw dbError;

      alert('✅ PDF exportado com sucesso e salvo no acervo do aluno!');
    } catch (err: any) {
      console.error('Erro ao exportar PDF:', err);
      alert('❌ Erro ao exportar PDF: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setExporting(false);
    }
  };

  const handleSalvarFicha = async () => {
    if (!alunoSelecionado || !nomeRotina || exerciciosFicha.length === 0) {
      alert("Preencha todos os campos obrigatórios"); return;
    }
    setSaving(true);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) { setSaving(false); alert('Sessão expirada. Faça login novamente.'); router.push('/login'); return; }

      const estrutura = {
        exercicios: exerciciosFicha.map((ex) => ({
          id: ex.id, nome: ex.nome, tipo_exercicio: ex.tipo_exercicio,
          descanso: ex.descanso, video_url: ex.video_url || "", observacoes: ex.observacoes || "",
          series: ex.series.map((s) => ({
            ordem: s.ordem, peso_atual: s.peso_sugerido ?? null,
            reps: s.reps_sugerido ?? null, tempo: s.tempo_sugerido ?? null,
            distancia: s.distancia_sugerida ?? null, tecnica: s.tecnica || null,
            tecnica_extra: s.tecnica_extra || null,
          })),
        })),
      };

      const { error } = await supabaseClient.from("fichas_treino").insert({
        coach_id: coachId, aluno_id: alunoSelecionado, nome_rotina: nomeRotina,
        configuracao: estrutura, ativo: true,
      });

      if (error) {
        console.error("Erro Supabase:", JSON.stringify(error, null, 2));
        throw new Error(error.message || error.code || "Erro desconhecido ao salvar no banco de dados");
      }

      router.push("/admin/treinos");
    } catch (err: any) {
      console.error("Erro ao salvar ficha:", err);
      alert("Erro ao salvar ficha: " + (err.message || "Verifique os logs"));
    } finally {
      setSaving(false);
    }
  };

  const filteredExercicios = exerciciosCatalogo.filter(ex =>
    ex.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.grupo_muscular.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Preparando ambiente..." />
      </div>
    );
  }

  const canSave = !!alunoSelecionado && !!nomeRotina && exerciciosFicha.length > 0;

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 pb-24 md:pb-32">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/treinos')}
              className="w-10 h-10 rounded-xl bg-surface-1 border border-border-subtle shadow-elev-1 flex items-center justify-center text-text-tertiary hover:text-brand hover:border-brand/20 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">
                Nova <span className="text-brand">Ficha Digital</span>
              </h1>
              <p className="text-xs text-text-tertiary">Monte o treino personalizado de alta fidelidade</p>
            </div>
          </div>
          <button
            onClick={handleSalvarFicha}
            disabled={saving || !canSave}
            className="hidden md:flex items-center gap-2 px-5 h-10 bg-brand text-text-on-brand rounded-xl text-xs font-semibold uppercase tracking-caps shadow-sm shadow-brand/30 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
            Publicar Ficha
          </button>
        </div>

        {/* Global Settings Card */}
        <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-5 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-caps text-text-tertiary">
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
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-caps text-text-tertiary">
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
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-base font-bold text-text-primary">
              Exercícios <span className="text-brand">({exerciciosFicha.length})</span>
            </h2>
            <button
              onClick={() => setModalExercicio(true)}
              className="flex items-center gap-2 px-4 h-9 bg-surface-1 border border-border-subtle shadow-elev-1 text-text-secondary rounded-xl text-xs font-semibold uppercase tracking-caps hover:text-brand hover:border-brand/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" weight="bold" /> Adicionar
            </button>
          </div>

          <div className="space-y-3">
            {exerciciosFicha.map((exercicio, exIndex) => (
              <div key={exIndex} className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-4">
                {/* Exercise Header */}
                <div className="flex flex-col md:flex-row gap-3 mb-4 pb-3 border-b border-border-subtle/50">
                  <div className="flex-1 space-y-1">
                    <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Exercício</label>
                    <input
                      type="text"
                      value={exercicio.nome}
                      onChange={(e) => atualizarExercicio(exIndex, "nome", e.target.value)}
                      className="w-full text-sm font-bold text-text-primary bg-transparent border-none p-0 focus:ring-0 focus:outline-none"
                    />
                  </div>
                  <div className="w-full md:w-28 space-y-1">
                    <label className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-caps text-text-tertiary">
                      <Clock className="w-3 h-3" /> Descanso
                    </label>
                    <TimeInput
                      value={exercicio.descanso}
                      onChange={(v) => atualizarExercicio(exIndex, "descanso", v)}
                      className="w-full px-3 py-1.5 bg-surface-2 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand/40"
                    />
                  </div>
                  <button
                    onClick={() => removerExercicio(exIndex)}
                    className="self-end w-9 h-9 flex items-center justify-center bg-danger/10 border border-danger/20 text-danger rounded-xl hover:opacity-80 transition-opacity"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>

                {/* Observações */}
                <div className="space-y-1 mb-4 pb-3 border-b border-border-subtle/50">
                  <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Observações para o Aluno</label>
                  <textarea
                    value={exercicio.observacoes}
                    onChange={(e) => atualizarExercicio(exIndex, "observacoes", e.target.value)}
                    placeholder="Ex: Manter o core contraído, não arquear as costas..."
                    className="w-full px-3 py-2 bg-surface-2 border border-border-subtle rounded-xl text-sm text-text-primary focus:outline-none focus:border-brand/40 resize-none"
                    rows={2}
                  />
                </div>

                {/* Series Table */}
                <div className="space-y-2">
                  {(() => {
                    const colunas = getColunasPorTipo(exercicio.tipo_exercicio);
                    const gridTemplate = `2rem ${colunas.map(() => '5rem').join(' ')} 4rem 5.5rem 2rem`;
                    return (
                      <>
                        {/* Desktop — scrollable table */}
                        <div className="hidden md:block overflow-x-auto">
                          {/* Header row */}
                          <div className="grid gap-1 px-2 mb-1 min-w-max" style={{ gridTemplateColumns: gridTemplate }}>
                            <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">#</span>
                            {colunas.map((col) => (
                              <span key={col.key} className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary truncate">{col.label}</span>
                            ))}
                            <span className="text-2xs font-semibold uppercase tracking-caps text-brand/70 truncate">TÉC</span>
                            <span className="text-2xs font-semibold uppercase tracking-caps text-brand/70 truncate"></span>
                            <span></span>
                          </div>

                          {exercicio.series.map((serie, sIndex) => (
                            <div key={sIndex} className="grid gap-1 bg-surface-2 border border-border-subtle/50 p-1.5 rounded-xl mb-1 min-w-max" style={{ gridTemplateColumns: gridTemplate }}>
                              <div className="flex items-center justify-center text-xs font-bold text-text-secondary">#{serie.ordem}</div>
                              {colunas.map((col) =>
                                col.type === 'select' ? (
                                  <select
                                    key={col.key}
                                    value={(serie as any)[col.key] ?? ''}
                                    onChange={(e) => atualizarSerie(exIndex, sIndex, col.key, e.target.value)}
                                    className="w-full h-7 px-1 bg-surface-0 border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none"
                                  >
                                    {(col as any).options?.map((opt: string) => <option key={opt} value={opt}>{opt || '-'}</option>)}
                                  </select>
                                ) : (col as any).timeInput ? (
                                  <TimeInput
                                    key={col.key}
                                    value={(serie as any)[col.key] ?? '00:00'}
                                    onChange={(v) => atualizarSerie(exIndex, sIndex, col.key, v)}
                                    className="w-full h-7 px-1 bg-surface-0 border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none text-center"
                                  />
                                ) : (
                                  <input
                                    key={col.key}
                                    type={col.type}
                                    step={(col as any).step}
                                    placeholder={(col as any).placeholder}
                                    value={(serie as any)[col.key] ?? (col.type === 'number' ? 0 : '')}
                                    onChange={(e) => atualizarSerie(exIndex, sIndex, col.key, col.type === 'number' ? Number(e.target.value) : e.target.value)}
                                    className="w-full h-7 px-1 bg-surface-0 border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none"
                                  />
                                )
                              )}
                              {/* TÉC */}
                              <select
                                value={(serie as any).tecnica ?? ''}
                                onChange={(e) => atualizarSerie(exIndex, sIndex, 'tecnica', e.target.value)}
                                className="w-full h-7 px-1 bg-surface-0 border border-brand/20 rounded-lg text-xs text-brand/80 focus:outline-none"
                              >
                                {TECNICAS_BASE.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
                              </select>
                              {/* Técnica Extra */}
                              <select
                                value={(serie as any).tecnica_extra ?? ''}
                                onChange={(e) => atualizarSerie(exIndex, sIndex, 'tecnica_extra', e.target.value)}
                                className="w-full h-7 px-1 bg-surface-0 border border-brand/20 rounded-lg text-xs text-brand/80 focus:outline-none"
                              >
                                {TECNICAS_EXTRA_OPCOES.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
                              </select>
                              <button onClick={() => removerSerie(exIndex, sIndex)} className="flex items-center justify-center text-text-tertiary hover:text-danger transition-colors">
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Mobile layout */}
                        {exercicio.series.map((serie, sIndex) => (
                          <div key={sIndex} className="md:hidden bg-surface-2 border border-border-subtle/50 p-3 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-text-primary">Série #{serie.ordem}</span>
                              <button onClick={() => removerSerie(exIndex, sIndex)} className="w-7 h-7 flex items-center justify-center text-text-tertiary hover:text-danger transition-colors">
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {colunas.map((col) => (
                                <div key={col.key} className="space-y-0.5">
                                  <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary px-1">{col.label}</label>
                                  {col.type === 'select' ? (
                                    <select
                                      value={(serie as any)[col.key] ?? ''}
                                      onChange={(e) => atualizarSerie(exIndex, sIndex, col.key, e.target.value)}
                                      className="w-full h-8 px-2 bg-surface-0 border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none"
                                    >
                                      {(col as any).options?.map((opt: string) => <option key={opt} value={opt}>{opt || '-'}</option>)}
                                    </select>
                                  ) : (col as any).timeInput ? (
                                    <TimeInput
                                      value={(serie as any)[col.key] ?? '00:00'}
                                      onChange={(v) => atualizarSerie(exIndex, sIndex, col.key, v)}
                                      className="w-full h-8 px-2 bg-surface-0 border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none text-center"
                                    />
                                  ) : (
                                    <input
                                      type={col.type}
                                      step={(col as any).step}
                                      placeholder={(col as any).placeholder}
                                      value={(serie as any)[col.key] ?? (col.type === 'number' ? 0 : '')}
                                      onChange={(e) => atualizarSerie(exIndex, sIndex, col.key, col.type === 'number' ? Number(e.target.value) : e.target.value)}
                                      className="w-full h-8 px-2 bg-surface-0 border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-border-subtle/50 pt-2">
                              <p className="text-2xs font-semibold uppercase tracking-caps text-brand/70 mb-1.5">Técnicas</p>
                              <div className="grid grid-cols-2 gap-1.5">
                                <div className="space-y-0.5">
                                  <label className="text-2xs font-semibold uppercase tracking-caps text-brand/70 px-1">TÉC</label>
                                  <select
                                    value={(serie as any).tecnica ?? ''}
                                    onChange={(e) => atualizarSerie(exIndex, sIndex, 'tecnica', e.target.value)}
                                    className="w-full h-8 px-2 bg-surface-0 border border-brand/20 rounded-lg text-xs text-brand/80 focus:outline-none"
                                  >
                                    {TECNICAS_BASE.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
                                  </select>
                                </div>
                                <div className="space-y-0.5">
                                  <label className="text-2xs font-semibold uppercase tracking-caps text-brand/70 px-1">Técnica Extra</label>
                                  <select
                                    value={(serie as any).tecnica_extra ?? ''}
                                    onChange={(e) => atualizarSerie(exIndex, sIndex, 'tecnica_extra', e.target.value)}
                                    className="w-full h-8 px-2 bg-surface-0 border border-brand/20 rounded-lg text-xs text-brand/80 focus:outline-none"
                                  >
                                    {TECNICAS_EXTRA_OPCOES.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}

                  <button
                    onClick={() => adicionarSerie(exIndex)}
                    className="w-full py-2 border-2 border-dashed border-border-subtle rounded-xl text-text-disabled text-2xs font-semibold uppercase tracking-caps hover:bg-brand/5 hover:border-brand/30 hover:text-brand transition-all"
                  >
                    + Adicionar Série
                  </button>
                </div>
              </div>
            ))}

            {exerciciosFicha.length === 0 && (
              <div className="bg-surface-1 border-2 border-dashed border-border-subtle rounded-2xl p-12 md:p-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-disabled mb-6">
                  <Barbell className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-text-primary mb-2">Nenhum exercício na ficha</h3>
                <p className="text-sm text-text-tertiary max-w-xs mb-6">Comece adicionando exercícios da biblioteca para o treino do atleta.</p>
                <button
                  onClick={() => setModalExercicio(true)}
                  className="px-6 h-10 bg-brand text-text-on-brand rounded-xl text-xs font-semibold uppercase tracking-caps shadow-sm shadow-brand/30 hover:opacity-90 transition-opacity"
                >
                  Abrir Biblioteca
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 mt-6">
          <button
            onClick={handleExportarPDF}
            disabled={exporting || !canSave}
            className="flex items-center gap-2 px-6 h-11 bg-surface-1 border border-border-subtle shadow-elev-1 text-text-secondary rounded-xl text-xs font-semibold uppercase tracking-caps hover:text-brand hover:border-brand/20 transition-all disabled:opacity-50"
          >
            {exporting ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FileArrowDown className="w-4 h-4" />}
            {exporting ? "Exportando..." : "Exportar PDF"}
          </button>
          <button
            onClick={handleSalvarFicha}
            disabled={saving || !canSave}
            className="flex items-center gap-2 px-6 h-11 bg-brand text-text-on-brand rounded-xl text-xs font-semibold uppercase tracking-caps shadow-sm shadow-brand/30 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
            {saving ? "Salvando..." : "Publicar Ficha"}
          </button>
        </div>

        {/* Modal BIBLIOTECA */}
        {modalExercicio && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalExercicio(false)} />
            <div className="bg-surface-1 border border-border-subtle shadow-elev-2 w-full max-w-2xl rounded-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-5 border-b border-border-subtle flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-base font-bold text-text-primary">Biblioteca <span className="text-brand">Fitness</span></h3>
                  <p className="text-xs text-text-tertiary">Selecione o movimento para adicionar</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setModalExercicio(false); setModalNovoExercicio(true); }}
                    className="px-3 h-8 bg-brand text-text-on-brand rounded-lg text-xs font-semibold uppercase tracking-caps hover:opacity-90 transition-opacity"
                  >
                    + Novo
                  </button>
                  <button onClick={() => setModalExercicio(false)} className="w-9 h-9 bg-surface-3 text-text-tertiary hover:text-danger rounded-xl flex items-center justify-center transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-shrink-0">
                <div className="relative">
                  <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome ou grupo muscular..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 bg-surface-0 border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
                {filteredExercicios.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => adicionarExercicio(ex)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-border-subtle bg-surface-2 hover:border-brand/30 hover:bg-brand/5 transition-all group"
                  >
                    <div className="text-left">
                      <p className="text-sm font-semibold text-text-primary group-hover:text-brand transition-colors">{ex.nome}</p>
                      <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">{ex.grupo_muscular}</p>
                    </div>
                    <CaretRight className="w-4 h-4 text-text-tertiary group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
                {filteredExercicios.length === 0 && (
                  <div className="py-16 text-center">
                    <p className="text-sm text-text-tertiary">Nenhum exercício encontrado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal NOVO EXERCÍCIO */}
        {modalNovoExercicio && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalNovoExercicio(false)} />
            <div className="bg-surface-1 border border-border-subtle shadow-elev-2 w-full max-w-lg rounded-2xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-5 border-b border-border-subtle flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-base font-bold text-text-primary">Criar <span className="text-brand">Novo Exercício</span></h3>
                  <p className="text-xs text-text-tertiary">Adicione à biblioteca e à ficha</p>
                </div>
                <button onClick={() => { setModalNovoExercicio(false); setErroValidacao(null); }} className="w-9 h-9 bg-surface-3 text-text-tertiary hover:text-danger rounded-xl flex items-center justify-center transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {erroValidacao && (
                  <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-3">
                    <WarningCircle className="text-danger mt-0.5 flex-shrink-0 w-4 h-4" />
                    <p className="text-danger text-sm">{erroValidacao}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Nome do Exercício *</label>
                  <input
                    type="text"
                    value={novoExercicioForm.nome}
                    onChange={(e) => setNovoExercicioForm({...novoExercicioForm, nome: e.target.value})}
                    placeholder="Ex: Supino Inclinado"
                    className={inputCls}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Grupo Muscular *</label>
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

                <div className="space-y-2">
                  <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Equipamento *</label>
                  <select
                    value={novoExercicioForm.equipamento}
                    onChange={(e) => setNovoExercicioForm({...novoExercicioForm, equipamento: e.target.value})}
                    className={selectCls}
                  >
                    <option value="">Selecione...</option>
                    {EQUIPAMENTOS.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Tipo de Exercício *</label>
                  <select
                    value={novoExercicioForm.tipo_exercicio}
                    onChange={(e) => setNovoExercicioForm({...novoExercicioForm, tipo_exercicio: e.target.value})}
                    className={selectCls}
                  >
                    <option value="">Selecione...</option>
                    {TIPOS_EXERCICIO.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Vídeo YouTube (opcional)</label>
                  <input
                    type="text"
                    value={novoExercicioForm.video_url}
                    onChange={(e) => setNovoExercicioForm({...novoExercicioForm, video_url: e.target.value})}
                    placeholder="youtu.be/ID ou youtube.com/watch?v=ID"
                    className={inputCls}
                  />
                  <p className="text-2xs text-text-disabled ml-1">Cole a URL completa ou apenas o ID do vídeo.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Descrição</label>
                  <textarea
                    value={novoExercicioForm.descricao}
                    onChange={(e) => setNovoExercicioForm({...novoExercicioForm, descricao: e.target.value})}
                    placeholder="Ex: Exercício para o desenvolvimento de peito..."
                    className="w-full bg-surface-0 border border-border-subtle text-text-primary px-4 py-3 rounded-xl text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 p-5 border-t border-border-subtle flex-shrink-0">
                <button
                  onClick={() => { setModalNovoExercicio(false); setErroValidacao(null); }}
                  className="flex-1 h-10 bg-surface-3 border border-border-subtle text-text-secondary rounded-xl text-xs font-semibold hover:text-text-primary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={criarNovoExercicio}
                  className="flex-1 h-10 bg-brand text-text-on-brand rounded-xl text-xs font-semibold uppercase tracking-caps shadow-sm shadow-brand/30 hover:opacity-90 transition-opacity"
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
