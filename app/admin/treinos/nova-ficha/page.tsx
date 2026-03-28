"use client";

import { useEffect, useState } from"react";
import { useRouter } from"next/navigation";
import { supabaseClient } from"@/lib/supabaseClient";
import { 
  Plus, 
  Trash2, 
  X, 
  Search, 
  ChevronRight, 
  Save, 
  Dumbbell, 
  Video, 
  Clock, 
  Layout,
  User,
  Loader2,
  ArrowLeft,
  AlertCircle,
  FileDown
} from"lucide-react";
import { extractYouTubeVideoId, isValidYouTubeUrl } from"@/lib/youtubeUtils";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  reps_sugerido?: string | number; // string para permitir clusters (ex: 3x4)
  tempo_sugerido?: string; // formato:"MM:SS"
  distancia_sugerida?: number; // em KM
  tecnica?: string; // WS, FS, TS
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

const EQUIPAMENTOS = ["Nenhum","Banda de Resistência","Banda de Suspensão","Barra","Disco de Peso","Haltere","Kettlebell","Máquina","Outro",
];

const TIPOS_EXERCICIO = ["Peso & Repetições","Repetições","Peso Corporal com Peso Acrescido","Duração","Duração e Peso","Distância e Duração","Peso e Distância",
];

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
    nome:"",
    grupo_muscular:"",
    descricao:"",
    video_url:"",
    equipamento:"",
    tipo_exercicio:"",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profile?.role !=="coach" && profile?.role !=="admin") {
        router.push("/aluno/treinos");
        return;
      }

      // Buscar apenas alunos relacionados ao coach
      const { data: alunoLinks } = await supabaseClient
        .from("coach_alunos")
        .select("aluno_id")
        .eq("coach_id", userId);

      const alunoIds = alunoLinks?.map(link => link.aluno_id) || [];
      
      let alunosData: any[] = [];
      if (alunoIds.length > 0) {
        const { data } = await supabaseClient
          .from("profiles")
          .select("id, coaching_reference, email")
          .in("id", alunoIds)
          .eq("arquivado", false)
          .order("coaching_reference", { ascending: true });
        alunosData = data || [];
      }

      setAlunos(alunosData);

      const { data: exerciciosData } = await supabaseClient
        .from("exercicios_biblioteca")
        .select("id, nome, grupo_muscular, tipo_exercicio, video_url")
        .order("nome", { ascending: true });

      setExerciciosCatalogo(exerciciosData || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const adicionarExercicio = (exercicio: Exercicio) => {
    // Prevenir duplicação
    const jaExiste = exerciciosFicha.some(ex => ex.id === exercicio.id);
    if (jaExiste) {
      alert("Este exercício já foi adicionado à ficha");
      return;
    }
    
    const tipoEx = exercicio.tipo_exercicio ||"Peso & Repetições";
    
    // Criar séries padrão baseado no tipo de exercício
    const criarSeriesPadrao = (tipo: string): SerieDefinicao[] => {
      const serieBase = { ordem: 1 };
      
      switch (tipo) {
        case"Peso & Repetições":
        case"Peso Corporal com Peso Acrescido":
          return [
            { ...serieBase, ordem: 1, reps_sugerido: "12", tecnica: "" },
            { ...serieBase, ordem: 2, reps_sugerido: "12", tecnica: "" },
            { ...serieBase, ordem: 3, reps_sugerido: "12", tecnica: "" },
          ];
        case"Repetições":
          return [
            { ...serieBase, ordem: 1, reps_sugerido: "12", tecnica: "" },
            { ...serieBase, ordem: 2, reps_sugerido: "12", tecnica: "" },
            { ...serieBase, ordem: 3, reps_sugerido: "12", tecnica: "" },
          ];
        case"Duração":
          return [
            { ...serieBase, ordem: 1, tempo_sugerido:"00:60", tecnica: "" },
            { ...serieBase, ordem: 2, tempo_sugerido:"00:60", tecnica: "" },
            { ...serieBase, ordem: 3, tempo_sugerido:"00:60", tecnica: "" },
          ];
        case"Duração e Peso":
          return [
            { ...serieBase, ordem: 1, tempo_sugerido:"00:60", tecnica: "" },
            { ...serieBase, ordem: 2, tempo_sugerido:"00:60", tecnica: "" },
            { ...serieBase, ordem: 3, tempo_sugerido:"00:60", tecnica: "" },
          ];
        case"Distância e Duração":
          return [
            { ...serieBase, ordem: 1, distancia_sugerida: 5, tempo_sugerido:"00:00", tecnica: "" },
            { ...serieBase, ordem: 2, distancia_sugerida: 5, tempo_sugerido:"00:00", tecnica: "" },
            { ...serieBase, ordem: 3, distancia_sugerida: 5, tempo_sugerido:"00:00", tecnica: "" },
          ];
        case"Peso e Distância":
          return [
            { ...serieBase, ordem: 1, distancia_sugerida: 5, tecnica: "" },
            { ...serieBase, ordem: 2, distancia_sugerida: 5, tecnica: "" },
            { ...serieBase, ordem: 3, distancia_sugerida: 5, tecnica: "" },
          ];
        default:
          return [
            { ...serieBase, ordem: 1, reps_sugerido: "12", tecnica: "" },
            { ...serieBase, ordem: 2, reps_sugerido: "12", tecnica: "" },
            { ...serieBase, ordem: 3, reps_sugerido: "12", tecnica: "" },
          ];
      }
    };
    
    const novoExercicio: ExercicioFicha = {
      id: exercicio.id,
      nome: exercicio.nome,
      tipo_exercicio: tipoEx,
      descanso:"1:30",
      video_url: exercicio.video_url || "",
      observacoes:"",
      series: criarSeriesPadrao(tipoEx),
    };
    setExerciciosFicha([...exerciciosFicha, novoExercicio]);
    setModalExercicio(false);
  };

  const criarNovoExercicio = async () => {
    if (!novoExercicioForm.nome || !novoExercicioForm.grupo_muscular || !novoExercicioForm.equipamento || !novoExercicioForm.tipo_exercicio) {
      alert("Preencha nome, grupo muscular, equipamento e tipo de exercício");
      return;
    }

    // Validar URL do YouTube se fornecida
    if (novoExercicioForm.video_url.trim()) {
      if (!isValidYouTubeUrl(novoExercicioForm.video_url)) {
        alert("URL do YouTube inválida. Use: youtu.be/ID ou youtube.com/watch?v=ID"
        );
        return;
      }
    }

    try {
      const videoId = novoExercicioForm.video_url
        ? extractYouTubeVideoId(novoExercicioForm.video_url)
        : null;

      const res = await fetch("/api/admin/exercicios-biblioteca", {
        method:"POST",
        headers: {"Content-Type":"application/json" },
        body: JSON.stringify({
          nome: novoExercicioForm.nome,
          grupo_muscular: novoExercicioForm.grupo_muscular,
          equipamento: novoExercicioForm.equipamento,
          tipo_exercicio: novoExercicioForm.tipo_exercicio,
          descricao: novoExercicioForm.descricao || null,
          video_url: videoId
            ? `https://youtube.com/embed/${videoId}`
            : null,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || payload?.details ||"Falha ao criar exercício");
      }

      const data = payload?.exercicio;
      if (!data?.id) throw new Error("Resposta inválida ao criar exercício");

      // Criar séries baseado no tipo de exercício
      const criarSeriesPadrao = (tipo: string): SerieDefinicao[] => {
        const serieBase = { ordem: 1 };
        
        switch (tipo) {
          case"Peso & Repetições":
          case"Peso Corporal com Peso Acrescido":
            return [
              { ...serieBase, ordem: 1, peso_sugerido: 0, reps_sugerido: 12 },
              { ...serieBase, ordem: 2, peso_sugerido: 0, reps_sugerido: 12 },
              { ...serieBase, ordem: 3, peso_sugerido: 0, reps_sugerido: 12 },
            ];
          case"Repetições":
            return [
              { ...serieBase, ordem: 1, reps_sugerido: 12 },
              { ...serieBase, ordem: 2, reps_sugerido: 12 },
              { ...serieBase, ordem: 3, reps_sugerido: 12 },
            ];
          case"Duração":
            return [
              { ...serieBase, ordem: 1, tempo_sugerido:"00:60" },
              { ...serieBase, ordem: 2, tempo_sugerido:"00:60" },
              { ...serieBase, ordem: 3, tempo_sugerido:"00:60" },
            ];
          case"Duração e Peso":
            return [
              { ...serieBase, ordem: 1, tempo_sugerido:"00:60", peso_sugerido: 0 },
              { ...serieBase, ordem: 2, tempo_sugerido:"00:60", peso_sugerido: 0 },
              { ...serieBase, ordem: 3, tempo_sugerido:"00:60", peso_sugerido: 0 },
            ];
          case"Distância e Duração":
            return [
              { ...serieBase, ordem: 1, distancia_sugerida: 5, tempo_sugerido:"00:00" },
              { ...serieBase, ordem: 2, distancia_sugerida: 5, tempo_sugerido:"00:00" },
              { ...serieBase, ordem: 3, distancia_sugerida: 5, tempo_sugerido:"00:00" },
            ];
          case"Peso e Distância":
            return [
              { ...serieBase, ordem: 1, peso_sugerido: 0, distancia_sugerida: 5 },
              { ...serieBase, ordem: 2, peso_sugerido: 0, distancia_sugerida: 5 },
              { ...serieBase, ordem: 3, peso_sugerido: 0, distancia_sugerida: 5 },
            ];
          default:
            return [
              { ...serieBase, ordem: 1, peso_sugerido: 0, reps_sugerido: 12 },
              { ...serieBase, ordem: 2, peso_sugerido: 0, reps_sugerido: 12 },
              { ...serieBase, ordem: 3, peso_sugerido: 0, reps_sugerido: 12 },
            ];
        }
      };

      // Adicionar o novo exercício à ficha
      const novoExercicio: ExercicioFicha = {
        id: data.id,
        nome: data.nome,
        tipo_exercicio: novoExercicioForm.tipo_exercicio,
        descanso:"1:30",
        video_url: videoId
          ? `https://youtube.com/embed/${videoId}`
          :"",
        observacoes:"",
        series: criarSeriesPadrao(novoExercicioForm.tipo_exercicio),
      };
      setExerciciosFicha([...exerciciosFicha, novoExercicio]);
      setExerciciosCatalogo([...exerciciosCatalogo, data]);
      
      // Limpar form
      setNovoExercicioForm({ nome:"", grupo_muscular:"", descricao:"", video_url:"", equipamento:"", tipo_exercicio:"" });
      setModalNovoExercicio(false);
      setErroValidacao(null);
    } catch (err: any) {
      console.error("Erro ao criar exercício:", err);
      setErroValidacao("Erro ao criar exercício:" + err.message);
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
    
    // Criar nova série baseado no tipo de exercício
    let novaSerie: SerieDefinicao = { ordem: novaOrdem };
    
    switch (tipo) {
      case"Peso & Repetições":
      case"Peso Corporal com Peso Acrescido":
        novaSerie = { ordem: novaOrdem, peso_sugerido: 0, reps_sugerido: 12 };
        break;
      case"Repetições":
        novaSerie = { ordem: novaOrdem, reps_sugerido: 12 };
        break;
      case"Duração":
        novaSerie = { ordem: novaOrdem, tempo_sugerido:"00:60" };
        break;
      case"Duração e Peso":
        novaSerie = { ordem: novaOrdem, tempo_sugerido:"00:60", peso_sugerido: 0 };
        break;
      case"Distância e Duração":
        novaSerie = { ordem: novaOrdem, distancia_sugerida: 5, tempo_sugerido:"00:00" };
        break;
      case"Peso e Distância":
        novaSerie = { ordem: novaOrdem, peso_sugerido: 0, distancia_sugerida: 5 };
        break;
      default:
        novaSerie = { ordem: novaOrdem, peso_sugerido: 0, reps_sugerido: 12 };
    }
    
    updated[exercicioIndex].series.push(novaSerie);
    setExerciciosFicha(updated);
  };

  const removerSerie = (exercicioIndex: number, serieIndex: number) => {
    const updated = [...exerciciosFicha];
    updated[exercicioIndex].series = updated[exercicioIndex].series.filter((_, i) => i !== serieIndex);
    updated[exercicioIndex].series.forEach((s, i) => {
      s.ordem = i + 1;
    });
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

  // Helper para determinar quais colunas mostrar baseado no tipo de exercício
  const getColunasPorTipo = (tipo: string) => {
    switch (tipo) {
      case"Peso & Repetições":
      case"Peso Corporal com Peso Acrescido":
        return [
          { key:"tecnica", label:"TÉCNICA", type:"select", options: ["", "WS", "FS", "TS"] },
          { key:"reps_sugerido", label:"REPS", type:"text", placeholder:"12 ou 3x4" }
        ];
      case"Repetições":
        return [
          { key:"tecnica", label:"TÉCNICA", type:"select", options: ["", "WS", "FS", "TS"] },
          { key:"reps_sugerido", label:"REPS", type:"text", placeholder:"12 ou 3x4" }
        ];
      case"Duração":
        return [
          { key:"tempo_sugerido", label:"TEMPO", type:"text", placeholder:"MM:SS" },
          { key:"tecnica", label:"TÉCNICA", type:"select", options: ["", "WS", "FS", "TS"] }
        ];
      case"Duração e Peso":
        return [
          { key:"tempo_sugerido", label:"TEMPO", type:"text", placeholder:"MM:SS" },
          { key:"tecnica", label:"TÉCNICA", type:"select", options: ["", "WS", "FS", "TS"] }
        ];
      case"Distância e Duração":
        return [
          { key:"distancia_sugerida", label:"KM", type:"number", step:"0.1" },
          { key:"tempo_sugerido", label:"TEMPO", type:"text", placeholder:"MM:SS" },
          { key:"tecnica", label:"TÉCNICA", type:"select", options: ["", "WS", "FS", "TS"] }
        ];
      case"Peso e Distância":
        return [
          { key:"tecnica", label:"TÉCNICA", type:"select", options: ["", "WS", "FS", "TS"] },
          { key:"distancia_sugerida", label:"KM", type:"number", step:"0.1" }
        ];
      default:
        return [
          { key:"tecnica", label:"TÉCNICA", type:"select", options: ["", "WS", "FS", "TS"] },
          { key:"reps_sugerido", label:"REPS", type:"text", placeholder:"12 ou 3x4" }
        ];
    }
  };

  const handleExportarPDF = async () => {
    if (!alunoSelecionado || !nomeRotina || exerciciosFicha.length === 0) {
      alert("Preencha os dados da ficha antes de exportar");
      return;
    }

    setExporting(true);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) throw new Error('Sessão inválida');

      // Buscar nome do aluno
      const { data: alunoData } = await supabaseClient
        .from('profiles')
        .select('coaching_reference, email')
        .eq('id', alunoSelecionado)
        .single();

      const nomeAluno = alunoData?.coaching_reference || alunoData?.email || 'Aluno';

      // Criar PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Cabeçalho
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('FICHA DE TREINO', 105, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(nomeRotina, 105, 28, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Atleta: ${nomeAluno}`, 20, 40);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 46);

      // Linha divisória
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 50, 190, 50);

      let currentY = 58;

      // Processar cada exercício
      exerciciosFicha.forEach((exercicio, index) => {
        // Verificar se precisa de nova página
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        // Nome do exercício
        doc.setFontSize(12);
        doc.setTextColor(212, 175, 55); // Dourado
        doc.text(`${index + 1}. ${exercicio.nome}`, 20, currentY);
        currentY += 6;

        // Link do vídeo (se existir)
        if (exercicio.video_url) {
          doc.setFontSize(8);
          doc.setTextColor(70, 130, 180); // Azul
          doc.textWithLink('🎥 Vídeo demonstrativo', 20, currentY, { url: exercicio.video_url });
          currentY += 5;
        }

        // Descanso e observações
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        if (exercicio.descanso) {
          doc.text(`Descanso: ${exercicio.descanso}`, 20, currentY);
          currentY += 5;
        }
        if (exercicio.observacoes) {
          const obsLines = doc.splitTextToSize(`Obs: ${exercicio.observacoes}`, 170);
          doc.text(obsLines, 20, currentY);
          currentY += (obsLines.length * 5);
        }

        // Tabela de séries
        const tableData = exercicio.series.map((serie) => {
          const row: any[] = [serie.ordem];
          
          // Colunas baseadas no tipo de exercício
          switch (exercicio.tipo_exercicio) {
            case 'Peso & Repetições':
            case 'Peso Corporal com Peso Acrescido':
              row.push(
                serie.peso_sugerido ?? '-',
                serie.reps_sugerido ?? '-',
                serie.tecnica || '-'
              );
              break;
            case 'Repetições':
              row.push(
                serie.reps_sugerido ?? '-',
                serie.tecnica || '-'
              );
              break;
            case 'Duração':
              row.push(
                serie.tempo_sugerido || '-',
                serie.tecnica || '-'
              );
              break;
            case 'Duração e Peso':
              row.push(
                serie.tempo_sugerido || '-',
                serie.peso_sugerido ?? '-',
                serie.tecnica || '-'
              );
              break;
            case 'Distância e Duração':
              row.push(
                serie.distancia_sugerida ?? '-',
                serie.tempo_sugerido || '-',
                serie.tecnica || '-'
              );
              break;
            case 'Peso e Distância':
              row.push(
                serie.peso_sugerido ?? '-',
                serie.distancia_sugerida ?? '-',
                serie.tecnica || '-'
              );
              break;
            default:
              row.push(
                serie.peso_sugerido ?? '-',
                serie.reps_sugerido ?? '-',
                serie.tecnica || '-'
              );
          }
          
          return row;
        });

        // Cabeçalhos baseados no tipo
        let headers: string[] = ['Série'];
        switch (exercicio.tipo_exercicio) {
          case 'Peso & Repetições':
          case 'Peso Corporal com Peso Acrescido':
            headers.push('Peso (kg)', 'Reps', 'Técnica');
            break;
          case 'Repetições':
            headers.push('Reps', 'Técnica');
            break;
          case 'Duração':
            headers.push('Tempo', 'Técnica');
            break;
          case 'Duração e Peso':
            headers.push('Tempo', 'Peso (kg)', 'Técnica');
            break;
          case 'Distância e Duração':
            headers.push('KM', 'Tempo', 'Técnica');
            break;
          case 'Peso e Distância':
            headers.push('Peso (kg)', 'KM', 'Técnica');
            break;
          default:
            headers.push('Peso (kg)', 'Reps', 'Técnica');
        }

        autoTable(doc, {
          startY: currentY,
          head: [headers],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [212, 175, 55],
            textColor: [0, 0, 0],
            fontSize: 9,
            fontStyle: 'bold'
          },
          bodyStyles: {
            fontSize: 9,
            textColor: [60, 60, 60]
          },
          margin: { left: 20 },
          tableWidth: 170
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      });

      // Converter PDF para Blob
      const pdfBlob = doc.output('blob');
      const fileName = `${alunoSelecionado}/${Date.now()}_${nomeRotina.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      // Upload para storage
      const { error: uploadError } = await supabaseClient.storage
        .from('treinos-pdf')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Registrar no banco
      const { error: dbError } = await supabaseClient
        .from('treinos_alunos')
        .insert({
          aluno_id: alunoSelecionado,
          coach_id: coachId,
          url_pdf: fileName,
          nome_arquivo: `${nomeRotina}.pdf`,
          data_upload: new Date().toISOString(),
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
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) { setSaving(false); alert('Sessão expirada. Faça login novamente.'); router.push('/login'); return; }

      const estrutura = {
        exercicios: exerciciosFicha.map((ex) => ({
          id: ex.id,
          nome: ex.nome,
          tipo_exercicio: ex.tipo_exercicio,
          descanso: ex.descanso,
          video_url: ex.video_url ||"",
          observacoes: ex.observacoes ||"",
          series: ex.series.map((s) => ({
            ordem: s.ordem,
            peso_atual: s.peso_sugerido ?? null,
            reps: s.reps_sugerido ?? null,
            tempo: s.tempo_sugerido ?? null,
            distancia: s.distancia_sugerida ?? null,
            tecnica: s.tecnica || null,
          })),
        })),
      };

      console.log("Salvando estrutura da ficha:", estrutura);
      console.log("Primeira série do primeiro exercício:", estrutura.exercicios[0]?.series[0]);

      const { error } = await supabaseClient.from("fichas_treino").insert({
        coach_id: coachId,
        aluno_id: alunoSelecionado,
        nome_rotina: nomeRotina,
        configuracao: estrutura,
        ativo: true,
      });

      if (error) {
        console.error("Erro Supabase completo:", JSON.stringify(error, null, 2));
        console.error("Erro message:", error.message);
        console.error("Erro code:", error.code);
        throw new Error(
          error.message || 
          error.code ||"Erro desconhecido ao salvar no banco de dados"
        );
      }

      router.push("/admin/treinos");
    } catch (err: any) {
      console.error("Erro detalhado ao salvar ficha:", err);
      alert("Erro ao salvar ficha:" + (err.message ||"Verifique os logs"));
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-brand-purple" size={40} />
        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Preparando ambiente...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-10 lg:pl-28 pb-24 md:pb-32">
      <div className="max-w-5xl mx-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6 md:mb-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/admin/treinos')}
              className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-brand-purple transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl text-slate-900 tracking-tight">Nova <span className="text-brand-purple">Ficha Digital</span></h1>
              <p className="text-slate-500 font-medium text-sm">Monte o treino personalizado de alta fidelidade</p>
            </div>
          </div>

          <button
            onClick={handleSalvarFicha}
            disabled={saving || !alunoSelecionado || !nomeRotina || exerciciosFicha.length === 0}
            className="hidden md:flex items-center gap-3 px-8 py-4 bg-[#D4AF37] text-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-lg hover:bg-white transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            PUBLICAR FICHA
          </button>
        </div>

        {/* Global Settings Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 md:p-8 lg:p-10 border border-slate-50 mb-6 md:mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Aluno */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-slate-400 ml-1">
                <User size={14} /> ALUNO
              </label>
              <select
                value={alunoSelecionado}
                onChange={(e) => setAlunoSelecionado(e.target.value)}
                className="w-full h-12 md:h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:border-brand-purple appearance-none transition-all cursor-pointer"
              >
                <option value="">Selecione o atleta...</option>
                {alunos.map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>
                    {aluno.coaching_reference}
                  </option>
                ))}
              </select>
            </div>

            {/* Nome da Rotina */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-slate-400 ml-1">
                <Layout size={14} /> TÍTULO DA ROTINA
              </label>
              <input
                type="text"
                value={nomeRotina}
                onChange={(e) => setNomeRotina(e.target.value)}
                placeholder="Ex: Treino A - Superior Foco Deltoide"
                className="w-full h-12 md:h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:border-brand-purple transition-all"
              />
            </div>
          </div>
        </div>

        {/* Exercises Section */}
        <div className="mb-6 md:mb-10">
          <div className="flex items-center justify-between mb-6 md:mb-8 px-4">
            <h2 className="text-xl md:text-2xl text-slate-900">Exercícios <span className="text-brand-purple">({exerciciosFicha.length})</span></h2>
            <button
              onClick={() => setModalExercicio(true)}
              className="flex items-center gap-3 px-4 md:px-6 py-2 md:py-3 bg-slate-900 text-white rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-slate-900/10 hover:bg-brand-purple transition-all"
            >
              <Plus size={16} /> ADICIONAR
            </button>
          </div>

          <div className="space-y-2 md:space-y-3">
            {exerciciosFicha.map((exercicio, exIndex) => (
              <div key={exIndex} className="bg-white rounded-2xl shadow-lg shadow-slate-100 border border-slate-50 p-2 md:p-3 lg:p-4 animate-fade-in">
                {/* Exercise Header */}
                <div className="flex flex-col md:flex-row gap-2 md:gap-3 mb-3 md:mb-4 border-b border-slate-50 pb-2 md:pb-3">
                  <div className="flex-1 space-y-2">
                    <label className="text-[8px] uppercase tracking-[0.2em] text-slate-300">Exercício Selecionado</label>
                    <input
                      type="text"
                      value={exercicio.nome}
                      onChange={(e) => atualizarExercicio(exIndex,"nome", e.target.value)}
                      className="w-full text-base text-slate-900 border-none bg-transparent p-0 focus:ring-0"
                    />
                  </div>
                  
                  <div className="w-full md:w-28 space-y-2">
                    <label className="flex items-center gap-1 text-[8px] uppercase tracking-[0.2em] text-slate-300">
                      <Clock size={10} /> DESCANSO
                    </label>
                    <input
                      type="text"
                      value={exercicio.descanso}
                      onChange={(e) => atualizarExercicio(exIndex,"descanso", e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700 focus:outline-none"
                    />
                  </div>

                  <button 
                    onClick={() => removerExercicio(exIndex)}
                    className="self-end w-9 h-9 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all border border-red-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Observações */}
                <div className="space-y-2 mb-3 md:mb-4 pb-3 md:pb-4 border-b border-slate-50">
                  <label className="text-[8px] uppercase tracking-[0.2em] text-slate-300">Observações para o Aluno</label>
                  <textarea
                    value={exercicio.observacoes}
                    onChange={(e) => atualizarExercicio(exIndex,"observacoes", e.target.value)}
                    placeholder="Ex: Manter o core contraído, não arquear as costas..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700 font-medium focus:outline-none focus:border-brand-purple resize-none"
                    rows={2}
                  />
                  <p className="text-[7px] text-slate-400">Apenas {alunoSelecionado ? 'o aluno selecionado' : 'o aluno desta ficha'} poderá ver essas observações</p>
                </div>

                {/* Series Table */}
                <div className="space-y-2">
                  {(() => {
                    const colunas = getColunasPorTipo(exercicio.tipo_exercicio);
                    const numColunas = colunas.length + 2; // +2 para SÉRIE e AÇÃO
                    
                    return (
                      <>
                        {/* Cabeçalhos Dinâmicos - Mobile: Ocultos */}
                        <div className="hidden md:grid gap-2 px-2" style={{ gridTemplateColumns: `auto ${colunas.map(() => '1fr').join(' ')} auto` }}>
                          <span className="text-[8px] uppercase tracking-[0.15em] text-slate-400">SÉRIE</span>
                          {colunas.map((col) => (
                            <span key={col.key} className="text-[8px] uppercase tracking-[0.15em] text-slate-400">
                              {col.label}
                            </span>
                          ))}
                          <span className="text-[8px] uppercase tracking-[0.15em] text-slate-400">AÇÃO</span>
                        </div>

                        {/* Linhas de Séries Dinâmicas */}
                        {exercicio.series.map((serie, sIndex) => (
                          <div key={sIndex}>
                            {/* Layout Mobile */}
                            <div className="md:hidden bg-slate-50/50 p-2 rounded-xl border border-slate-100/50 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-900">Série #{serie.ordem}</span>
                                <button 
                                  onClick={() => removerSerie(exIndex, sIndex)}
                                  className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-1.5">
                                {colunas.map((col) => (
                                  <div key={col.key} className="space-y-0.5">
                                    <label className="text-[7px] uppercase tracking-wide text-slate-400 px-1">{col.label}</label>
                                    {col.type === 'select' ? (
                                      <select
                                        value={(serie as any)[col.key] ?? ''}
                                        onChange={(e) => {
                                          atualizarSerie(exIndex, sIndex, col.key, e.target.value);
                                        }}
                                        className="w-full h-8 px-2 py-1 bg-white border border-slate-100 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-brand-purple"
                                      >
                                        {(col as any).options?.map((opt: string) => (
                                          <option key={opt} value={opt}>{opt || '-'}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        type={col.type}
                                        step={(col as any).step}
                                        placeholder={(col as any).placeholder}
                                        value={(serie as any)[col.key] ?? (col.type === 'number' ? 0 : '')}
                                        onChange={(e) => {
                                          const value = col.type === 'number' ? Number(e.target.value) : e.target.value;
                                          atualizarSerie(exIndex, sIndex, col.key, value);
                                        }}
                                        className="w-full h-8 px-2 py-1 bg-white border border-slate-100 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-brand-purple"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Layout Desktop */}
                            <div className="hidden md:grid gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100/50" style={{ gridTemplateColumns: `auto ${colunas.map(() => '1fr').join(' ')} auto` }}>
                              <div className="flex items-center text-sm text-slate-900 ml-2">#{serie.ordem}</div>
                              
                              {/* Inputs Dinâmicos baseado no tipo de exercício */}
                              {colunas.map((col) => (
                                col.type === 'select' ? (
                                  <select
                                    key={col.key}
                                    value={(serie as any)[col.key] ?? ''}
                                    onChange={(e) => {
                                      atualizarSerie(exIndex, sIndex, col.key, e.target.value);
                                    }}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none shadow-sm"
                                  >
                                    {(col as any).options?.map((opt: string) => (
                                      <option key={opt} value={opt}>{opt || '-'}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    key={col.key}
                                    type={col.type}
                                    step={(col as any).step}
                                    placeholder={(col as any).placeholder}
                                    value={(serie as any)[col.key] ?? (col.type === 'number' ? 0 : '')}
                                    onChange={(e) => {
                                      const value = col.type === 'number' ? Number(e.target.value) : e.target.value;
                                      atualizarSerie(exIndex, sIndex, col.key, value);
                                    }}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-sm text-slate-900 focus:outline-none shadow-sm"
                                  />
                                )
                              ))}
                              
                              <button 
                                onClick={() => removerSerie(exIndex, sIndex)}
                                className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}

                  <button 
                    onClick={() => adicionarSerie(exIndex)}
                    className="w-full py-2 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-[9px] uppercase tracking-[0.15em] hover:bg-slate-50 hover:border-brand-purple/20 hover:text-brand-purple transition-all"
                  >
                    + Adicionar Série
                  </button>
                </div>
              </div>
            ))}

            {exerciciosFicha.length === 0 && (
              <div className="bg-white rounded-2xl p-12 md:p-20 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-6">
                  <Dumbbell size={40} />
                </div>
                <h3 className="text-lg md:text-xl text-slate-900 mb-2">Nenhum exercício na ficha</h3>
                <p className="text-slate-500 max-w-xs mb-6 md:mb-8">Comece adicionando os exercícios da biblioteca para o treino do atleta.</p>
                <button
                  onClick={() => setModalExercicio(true)}
                  className="px-6 md:px-8 py-3 md:py-4 bg-brand-purple text-white rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-brand-purple/20 hover:scale-105 transition-all"
                >
                  Abrir Biblioteca
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Bar - Mobile & Desktop */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-8 md:mt-12">
          <button
            onClick={handleExportarPDF}
            disabled={exporting || !alunoSelecionado || !nomeRotina || exerciciosFicha.length === 0}
            className="flex items-center gap-3 px-8 py-4 bg-slate-700 text-white rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={18} />}
            {exporting ? "EXPORTANDO..." : "EXPORTAR PDF"}
          </button>

          <button
            onClick={handleSalvarFicha}
            disabled={saving || !alunoSelecionado || !nomeRotina || exerciciosFicha.length === 0}
            className="flex items-center gap-3 px-8 py-4 bg-[#D4AF37] text-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? "SALVANDO..." : "PUBLICAR FICHA"}
          </button>
        </div>

        {/* Modal BIBLIOTECA */}
        {modalExercicio && (
          <div className="fixed inset-0 z-100 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setModalExercicio(false)} />
            
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-6 md:p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl md:text-2xl text-slate-900">Biblioteca <span className="text-brand-purple">Fitness</span></h3>
                  <p className="text-slate-400 text-sm font-medium">Selecione o movimento para adicionar</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setModalExercicio(false);
                      setModalNovoExercicio(true);
                    }}
                    className="px-4 py-2 bg-brand-purple text-white rounded-xl text-[10px] uppercase tracking-widest hover:bg-opacity-90 transition-all"
                  >
                    + Novo
                  </button>
                  <button onClick={() => setModalExercicio(false)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-100">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-4 md:p-6">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Filtrar por nome ou grupo muscular..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-12 md:h-14 pl-12 md:pl-14 pr-4 md:pr-6 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-purple/5 focus:border-brand-purple text-slate-900 font-medium transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-0 space-y-2">
                {filteredExercicios.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => adicionarExercicio(ex)}
                    className="w-full flex items-center justify-between p-5 rounded-3xl border border-slate-50 bg-white hover:border-brand-purple hover:bg-brand-purple/5 transition-all group"
                  >
                    <div className="text-left">
                      <p className="text-slate-900 group-hover:text-brand-purple transition-colors">{ex.nome}</p>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">{ex.grupo_muscular}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-purple group-hover:translate-x-1 transition-all" />
                  </button>
                ))}

                {filteredExercicios.length === 0 && (
                  <div className="py-20 text-center">
                    <p className="text-slate-400">Nenhum exercício encontrado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {modalNovoExercicio && (
          <div className="fixed inset-0 z-101 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setModalNovoExercicio(false)} />
            
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl text-slate-900">Criar <span className="text-brand-purple">Novo Exercício</span></h3>
                  <p className="text-slate-400 text-sm font-medium">Adicione à biblioteca e à ficha</p>
                </div>
                <button onClick={() => {
                  setModalNovoExercicio(false);
                  setErroValidacao(null);
                }} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-100">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                {erroValidacao && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="text-red-600 mt-0.5 shrink-0" size={18} />
                    <p className="text-red-700 font-medium text-sm">{erroValidacao}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="block text-[9px] uppercase tracking-[0.3em] text-slate-400">Nome do Exercício *</label>
                  <input
                    type="text"
                    value={novoExercicioForm.nome}
                    onChange={(e) => setNovoExercicioForm({...novoExercicioForm, nome: e.target.value})}
                    placeholder="Ex: Supino Inclinado"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-brand-purple"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-[9px] uppercase tracking-[0.3em] text-slate-400">Grupo Muscular *</label>
                  <select
                    value={novoExercicioForm.grupo_muscular}
                    onChange={(e) => setNovoExercicioForm({...novoExercicioForm, grupo_muscular: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-brand-purple appearance-none"
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

                <div className="space-y-3">
                  <label className="block text-[9px] uppercase tracking-[0.3em] text-slate-400">Equipamento *</label>
                  <select
                    value={novoExercicioForm.equipamento}
                    onChange={(e) => setNovoExercicioForm({...novoExercicioForm, equipamento: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 focus:outline-none focus:border-brand-purple appearance-none"
                  >
                    <option value="">Selecione...</option>
                    {EQUIPAMENTOS.map((eq) => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-[9px] uppercase tracking-[0.3em] text-slate-400">Tipo de Exercício *</label>
                  <select
                    value={novoExercicioForm.tipo_exercicio}
                    onChange={(e) => setNovoExercicioForm({...novoExercicioForm, tipo_exercicio: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 focus:outline-none focus:border-brand-purple appearance-none"
                  >
                    <option value="">Selecione...</option>
                    {TIPOS_EXERCICIO.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-[9px] uppercase tracking-[0.3em] text-slate-400">Vídeo YouTube (Link do YouTube ou ID)</label>
                  <input
                    type="text"
                    value={novoExercicioForm.video_url}
                    onChange={(e) => setNovoExercicioForm({...novoExercicioForm, video_url: e.target.value})}
                    placeholder="youtu.be/dQw4w9WgXcQ ou youtube.com/watch?v=dQw4w9WgXcQ"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-brand-purple"
                  />
                  <p className="text-[8px] text-slate-500 font-medium">Cole a URL completa ou apenas o ID do vídeo. Deixe em branco se não tiver.</p>
                </div>

                <div className="space-y-3">
                  <label className="block text-[9px] uppercase tracking-[0.3em] text-slate-400">Descrição</label>
                  <textarea
                    value={novoExercicioForm.descricao}
                    onChange={(e) => setNovoExercicioForm({...novoExercicioForm, descricao: e.target.value})}
                    placeholder="Ex: Exercício para o desenvolvimento de peito..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-brand-purple resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setModalNovoExercicio(false);
                      setErroValidacao(null);
                    }}
                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-900 rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={criarNovoExercicio}
                    className="flex-1 px-6 py-3 bg-brand-purple text-white rounded-xl text-[10px] uppercase tracking-widest hover:bg-opacity-90 transition-all"
                  >
                    Criar e Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
