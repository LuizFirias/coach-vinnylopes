"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { ArrowLeft, Save, Plus, Trash2, X, FileDown, Loader2 } from "lucide-react";
import Link from "next/link";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Serie {
  ordem: number;
  reps_sugerido: number | string;
  tecnica?: string;
}

interface Exercicio {
  id: string;
  nome: string;
  grupo_muscular?: string;
  descanso: string;
  video_url?: string;
  observacoes?: string;
  series: Serie[];
}

interface Ficha {
  id: string;
  nome_rotina: string;
  configuracao: {
    exercicios: Exercicio[];
  };
  coach_id: string;
  aluno_id: string;
}

export default function EditarFichaPage({ params }: { params: Promise<{ id: string; fichaId: string }> }) {
  const router = useRouter();
  const { id, fichaId } = use(params);
  
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nomeFicha, setNomeFicha] = useState("");
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [catalogoExercicios, setCatalogoExercicios] = useState<any[]>([]);
  const [showAddExercicioModal, setShowAddExercicioModal] = useState(false);
  const [searchExercicio, setSearchExercicio] = useState("");

  useEffect(() => {
    loadData();
  }, [fichaId]);

  const loadData = async () => {
    try {
      // Buscar a ficha
      const { data: fichaData, error: fichaError } = await supabaseClient
        .from("fichas_treino")
        .select("*")
        .eq("id", fichaId)
        .single();

      if (fichaError || !fichaData) {
        setError("Ficha não encontrada");
        setLoading(false);
        return;
      }

      const fichaTyped = fichaData as Ficha;
      setFicha(fichaTyped);
      setNomeFicha(fichaTyped.nome_rotina || "");
      
      // Normalizar exercícios
      const exerciciosNormalizados = (fichaTyped.configuracao?.exercicios || []).map(ex => ({
        ...ex,
        observacoes: ex.observacoes || "",
        series: (ex.series || []).map(s => ({
          ...s,
          reps_sugerido: s.reps_sugerido ?? 0,
          tecnica: s.tecnica || "",
        })),
      }));
      
      setExercicios(exerciciosNormalizados);

      // Buscar catálogo de exercícios
      const { data: catalogoData } = await supabaseClient
        .from("exercicios_biblioteca")
        .select("id, nome, grupo_muscular, video_url")
        .order("nome", { ascending: true });

      setCatalogoExercicios(catalogoData || []);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar ficha");
      setLoading(false);
    }
  };

  const handleUpdateSerie = (exercicioIdx: number, serieIdx: number, field: string, value: any) => {
    const updated = [...exercicios];
    (updated[exercicioIdx].series[serieIdx] as any)[field] = value;
    setExercicios(updated);
  };

  const handleRemoveExercicio = (idx: number) => {
    setExercicios(exercicios.filter((_, i) => i !== idx));
  };

  const handleAddSerie = (exercicioIdx: number) => {
    const updated = [...exercicios];
    const novaOrdem = Math.max(...(updated[exercicioIdx].series.map(s => s.ordem) || [0])) + 1;
    updated[exercicioIdx].series.push({
      ordem: novaOrdem,
      reps_sugerido: "12",
      tecnica: "",
    });
    setExercicios(updated);
  };

  const handleRemoveSerie = (exercicioIdx: number, serieIdx: number) => {
    const updated = [...exercicios];
    updated[exercicioIdx].series.splice(serieIdx, 1);
    setExercicios(updated);
  };

  const handleAddExercicio = (catalogExercicio: any) => {
    const newExercicio: Exercicio = {
      id: catalogExercicio.id,
      nome: catalogExercicio.nome,
      grupo_muscular: catalogExercicio.grupo_muscular,
      descanso: "60s",
      video_url: catalogExercicio.video_url,
      observacoes: "",
      series: [
        {
          ordem: 1,
          reps_sugerido: "12",
          tecnica: "",
        },
      ],
    };
    setExercicios([...exercicios, newExercicio]);
    setShowAddExercicioModal(false);
    setSearchExercicio("");
  };

  const filteredCatalogo = catalogoExercicios.filter(ex =>
    ex.nome.toLowerCase().includes(searchExercicio.toLowerCase())
  );
  const handleExportarPDF = async () => {
    if (!nomeFicha.trim() || exercicios.length === 0) {
      setError("Preencha os dados da ficha antes de exportar");
      return;
    }

    setExportingPDF(true);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) throw new Error('Sessão inválida');

      // Buscar nome do aluno
      const { data: alunoData } = await supabaseClient
        .from('profiles')
        .select('coaching_reference, email')
        .eq('id', id)
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
      doc.text(nomeFicha, 105, 28, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Atleta: ${nomeAluno}`, 20, 40);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 46);

      // Linha divisória
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 50, 190, 50);

      let currentY = 58;

      // Processar cada exercício
      exercicios.forEach((exercicio, index) => {
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
        const tableData = exercicio.series.map((serie) => [
          serie.ordem,
          '-', // Anterior (vazio)
          '-', // Peso (vazio para aluno preencher)
          serie.reps_sugerido || '-',
          serie.tecnica || '-'
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['Série', 'Anterior', 'Peso (kg)', 'Reps', 'Técnica']],
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
      const fileName = `${id}/${Date.now()}_${nomeFicha.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

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
          aluno_id: id,
          coach_id: coachId,
          url_pdf: fileName,
          nome_arquivo: `${nomeFicha}.pdf`,
          data_upload: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      alert('✅ PDF exportado com sucesso e salvo no acervo do aluno!');
    } catch (err: any) {
      console.error('Erro ao exportar PDF:', err);
      setError('Erro ao exportar PDF: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setExportingPDF(false);
    }
  };
  const handleSalvar = async () => {
    if (!nomeFicha.trim()) {
      setError("Nome da ficha é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabaseClient
        .from("fichas_treino")
        .update({
          nome_rotina: nomeFicha,
          configuracao: {
            exercicios: exercicios.map(ex => ({
              id: ex.id,
              nome: ex.nome,
              descanso: ex.descanso,
              video_url: ex.video_url || "",
              observacoes: ex.observacoes || "",
              series: ex.series.map(s => ({
                ordem: s.ordem,
                reps_sugerido: s.reps_sugerido,
                tecnica: s.tecnica || null,
              })),
            })),
          },
        })
        .eq("id", fichaId);

      if (error) throw error;

      router.push(`/admin/aluno/${id}`);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar ficha");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6 flex items-center justify-center">
        <p className="text-zinc-400 text-sm  uppercase tracking-widest">Carregando ficha...</p>
      </div>
    );
  }

  if (!ficha) {
    return (
      <div className="min-h-screen bg-black p-6">
        <Link href={`/admin/aluno/${id}`} className="text-iron-gold  text-[10px] uppercase tracking-widest inline-flex items-center gap-2 mb-6">
          <ArrowLeft size={14} /> Voltar
        </Link>
        <p className="text-red-500 ">Ficha não encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6 lg:p-10 lg:pl-28">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/admin/aluno/${id}`} 
            className="inline-flex items-center gap-2 text-iron-gold  text-[10px] uppercase tracking-widest mb-4 hover:gap-3 transition-all"
          >
            <ArrowLeft size={14} /> Voltar para Perfil
          </Link>
          <h1 className="text-4xl md:text-5xl  text-white tracking-tighter uppercase mb-2">
            Editar <span className="text-zinc-500">Ficha Digital</span>
          </h1>
          <p className="text-zinc-400 font-medium">Modifique os exercícios e cargas da ficha</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm  flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Nome da Ficha */}
        <div className="bg-black rounded-3xl p-6 md:p-10 border border-white/5 shadow-2xl mb-8">
          <label className="text-[10px]  text-zinc-600 uppercase tracking-widest mb-3 block">
            Nome da Ficha
          </label>
          <input
            type="text"
            value={nomeFicha}
            onChange={(e) => setNomeFicha(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-2xl text-white  focus:outline-none focus:border-iron-gold/40 transition-all"
            placeholder="Ex: Quadríceps Pesado"
          />
        </div>

        {/* Exercícios */}
        <div className="space-y-4">
          {exercicios.map((ex, exIdx) => (
            <div key={ex.id} className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 md:p-8">
              {/* Header do Exercício */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h3 className="text-lg  text-white mb-2">{ex.nome}</h3>
                  <p className="text-zinc-500 text-[10px]  uppercase tracking-widest">{ex.grupo_muscular || 'Exercício'}</p>
                </div>
                <button
                  onClick={() => handleRemoveExercicio(exIdx)}
                  className="p-2 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Observações */}
              <div className="space-y-3 mb-6 pb-6 border-b border-white/5">
                <label className="text-[9px] uppercase tracking-[0.3em] text-zinc-600">Observações para o Aluno</label>
                <textarea
                  value={ex.observacoes || ""}
                  onChange={(e) => {
                    const updated = [...exercicios];
                    updated[exIdx].observacoes = e.target.value;
                    setExercicios(updated);
                  }}
                  placeholder="Ex: Manter o core contraído, não arquear as costas, respirar na descida..."
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white font-medium focus:outline-none focus:border-iron-gold/40 resize-none"
                  rows={3}
                />
                <p className="text-[8px] text-zinc-600">Apenas o aluno desta ficha poderá ver essas observações</p>
              </div>

              {/* Séries */}
              <div className="space-y-3 mb-4">
                {ex.series.map((serie, serieIdx) => (
                  <div key={serieIdx}>
                    {/* Layout Mobile */}
                    <div className="md:hidden bg-black/50 rounded-2xl border border-white/5 p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-iron-gold/10 flex items-center justify-center text-iron-gold text-[10px]">
                          {serie.ordem}
                        </div>
                        <button
                          onClick={() => handleRemoveSerie(exIdx, serieIdx)}
                          className="p-2 text-zinc-700 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase tracking-wider text-zinc-600 px-1">Reps</label>
                          <input
                            type="text"
                            value={serie.reps_sugerido}
                            onChange={(e) => handleUpdateSerie(exIdx, serieIdx, "reps_sugerido", e.target.value)}
                            placeholder="12 ou 3x4"
                            className="w-full h-11 px-3 py-2.5 bg-zinc-900 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-iron-gold/40 text-center"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase tracking-wider text-zinc-600 px-1">Técnica</label>
                          <select
                            value={serie.tecnica || ""}
                            onChange={(e) => handleUpdateSerie(exIdx, serieIdx, "tecnica", e.target.value)}
                            className="w-full h-11 px-3 py-2.5 bg-zinc-900 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-iron-gold/40"
                          >
                            <option value="">-</option>
                            <option value="WS">WS</option>
                            <option value="FS">FS</option>
                            <option value="TS">TS</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Layout Desktop */}
                    <div className="hidden md:flex items-center gap-4 p-4 bg-black/50 rounded-2xl border border-white/5">
                      <div className="w-8 h-8 rounded-lg bg-iron-gold/10 flex items-center justify-center text-iron-gold text-[10px]">
                        {serie.ordem}
                      </div>
                      <input
                        type="text"
                        value={serie.reps_sugerido}
                        onChange={(e) => handleUpdateSerie(exIdx, serieIdx, "reps_sugerido", e.target.value)}
                        placeholder="12 ou 3x4"
                        className="w-20 h-10 px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-iron-gold/40 text-center"
                      />
                      <span className="text-zinc-500 text-[12px]">reps</span>
                      <select
                        value={serie.tecnica || ""}
                        onChange={(e) => handleUpdateSerie(exIdx, serieIdx, "tecnica", e.target.value)}
                        className="w-20 h-10 px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-iron-gold/40"
                      >
                        <option value="">Téc</option>
                        <option value="WS">WS</option>
                        <option value="FS">FS</option>
                        <option value="TS">TS</option>
                      </select>
                      <button
                        onClick={() => handleRemoveSerie(exIdx, serieIdx)}
                        className="ml-auto p-2 text-zinc-700 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Adicionar Série */}
              <button
                onClick={() => handleAddSerie(exIdx)}
                className="w-full py-2 text-[10px]  uppercase tracking-[0.2em] text-iron-gold border border-iron-gold/30 rounded-lg hover:bg-iron-gold/5 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Adicionar Série
              </button>
            </div>
          ))}
        </div>

        {/* Adicionar Exercício do Catálogo */}
        <button
          onClick={() => setShowAddExercicioModal(true)}
          className="w-full py-4 px-6 bg-zinc-900/50 border-2 border-dashed border-iron-gold/30 rounded-3xl text-iron-gold text-[10px]  uppercase tracking-[0.2em] hover:bg-iron-gold/5 hover:border-iron-gold/50 transition-all flex items-center justify-center gap-3 mb-8"
        >
          <Plus size={16} /> Adicionar Exercício do Catálogo
        </button>

        {exercicios.length === 0 && (
          <div className="bg-zinc-900/20 rounded-3xl p-12 text-center border border-dashed border-white/5 mb-8">
            <p className="text-zinc-600 text-[10px]  uppercase tracking-[0.4em]">Nenhum exercício nesta ficha</p>
          </div>
        )}

        {/* Botão Salvar */}
        <div className="flex flex-col sm:flex-row gap-4 mt-12">
          <button
            onClick={handleExportarPDF}
            disabled={exportingPDF}
            className="flex-1 py-4 bg-slate-700 text-white text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {exportingPDF ? <Loader2 className="animate-spin" size={16} /> : <FileDown size={16} />}
            {exportingPDF ? "Exportando..." : "Exportar PDF"}
          </button>
          <button
            onClick={handleSalvar}
            disabled={saving}
            className="flex-1 py-4 bg-iron-gold text-black text-[10px]  uppercase tracking-[0.3em] rounded-2xl hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(212,175,55,0.1)]"
          >
            <Save size={16} />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
          <button
            onClick={() => router.push(`/admin/aluno/${id}`)}
            className="flex-1 py-4 bg-zinc-900 text-white text-[10px]  uppercase tracking-[0.3em] rounded-2xl border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-3"
          >
            <X size={16} />
            Cancelar
          </button>
        </div>

        {/* Modal Adicionar Exercício */}
        {showAddExercicioModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-black rounded-3xl border border-white/5 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              {/* Header Modal */}
              <div className="sticky top-0 bg-black border-b border-white/5 p-6 flex items-center justify-between">
                <h2 className="text-2xl  text-white uppercase">Adicionar Exercício</h2>
                <button
                  onClick={() => {
                    setShowAddExercicioModal(false);
                    setSearchExercicio("");
                  }}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Search */}
              <div className="p-6 border-b border-white/5">
                <input
                  type="text"
                  placeholder="Buscar exercício..."
                  value={searchExercicio}
                  onChange={(e) => setSearchExercicio(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-white  focus:outline-none focus:border-iron-gold/40 transition-all"
                />
              </div>

              {/* Lista de Exercícios */}
              <div className="divide-y divide-white/5">
                {filteredCatalogo.length > 0 ? (
                  filteredCatalogo.map((exCatalogo) => {
                    const jáAdicionado = exercicios.some(e => e.id === exCatalogo.id);
                    return (
                      <div key={exCatalogo.id} className="p-6 hover:bg-zinc-900/30 transition-colors flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-white mb-1">{exCatalogo.nome}</h3>
                          <p className="text-zinc-500 text-[10px]  uppercase tracking-widest">
                            {exCatalogo.grupo_muscular || 'Exercício'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddExercicio(exCatalogo)}
                          disabled={jáAdicionado}
                          className="px-6 py-2 bg-iron-gold text-black  text-[10px] uppercase tracking-widest rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                          <Plus size={14} />
                          {jáAdicionado ? "Já Adicionado" : "Adicionar"}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center text-zinc-500">
                    <p className="uppercase tracking-widest text-[10px]">Nenhum exercício encontrado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
