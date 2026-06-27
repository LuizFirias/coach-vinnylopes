"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { ArrowLeft, FloppyDisk, Plus, Trash, X, FileArrowDown, CircleNotch, CaretUp, CaretDown } from "@phosphor-icons/react";
import Link from "next/link";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import TimeInput from "@/app/components/TimeInput";

interface Serie {
  ordem: number;
  reps_sugerido: number | string;
  tecnica?: string;
  tecnica_extra?: string;
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

const fieldCls = "w-full px-4 py-3 bg-surface-3 border border-border-default rounded-xl text-text-primary text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-all";

const TECNICAS_BASE_EDIT = ["", "WS", "FS", "TS"];
const TECNICAS_EXTRA_OPCOES_EDIT = ["", "Cluster Set", "Drop Set", "Bi-Set", "Super Set", "Repetições Parciais", "Isometria"];

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

      const exerciciosNormalizados = (fichaTyped.configuracao?.exercicios || []).map(ex => ({
        ...ex,
        observacoes: ex.observacoes || "",
        series: (ex.series || []).map(s => ({
          ...s,
          reps_sugerido: s.reps_sugerido ?? (s as any).reps ?? "",
          tecnica: s.tecnica || "",
          tecnica_extra: (s as any).tecnica_extra
            || ((s as any).cluster ? "Cluster Set" : null)
            || ((s as any).drop_set ? "Drop Set" : null)
            || ((s as any).bi_set ? "Bi-Set" : null)
            || ((s as any).isometria ? "Isometria" : null)
            || "",
        })),
      }));

      setExercicios(exerciciosNormalizados);

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

  const handleMoveExercicio = (idx: number, direction: -1 | 1) => {
    const next = idx + direction;
    if (next < 0 || next >= exercicios.length) return;
    const updated = [...exercicios];
    [updated[idx], updated[next]] = [updated[next], updated[idx]];
    setExercicios(updated);
  };

  const handleAddSerie = (exercicioIdx: number) => {
    const updated = [...exercicios];
    const novaOrdem = Math.max(...(updated[exercicioIdx].series.map(s => s.ordem) || [0])) + 1;
    updated[exercicioIdx].series.push({ ordem: novaOrdem, reps_sugerido: "12", tecnica: "", tecnica_extra: "" });
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
      descanso: "01:00",
      video_url: catalogExercicio.video_url,
      observacoes: "",
      series: [{ ordem: 1, reps_sugerido: "12", tecnica: "", tecnica_extra: "" }],
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

      const { data: alunoData } = await supabaseClient
        .from('profiles')
        .select('coaching_reference, email')
        .eq('id', id)
        .single();

      const nomeAluno = alunoData?.coaching_reference || alunoData?.email || 'Aluno';

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('FICHA DE TREINO', 105, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(nomeFicha, 105, 28, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Atleta: ${nomeAluno}`, 20, 40);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 46);

      doc.setDrawColor(200, 200, 200);
      doc.line(20, 50, 190, 50);

      let currentY = 58;

      exercicios.forEach((exercicio, index) => {
        if (currentY > 250) { doc.addPage(); currentY = 20; }

        doc.setFontSize(12);
        doc.setTextColor(212, 175, 55);
        doc.text(`${index + 1}. ${exercicio.nome}`, 20, currentY);
        currentY += 6;

        if (exercicio.video_url) {
          doc.setFontSize(8);
          doc.setTextColor(70, 130, 180);
          doc.textWithLink('🎥 Vídeo demonstrativo', 20, currentY, { url: exercicio.video_url });
          currentY += 5;
        }

        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        if (exercicio.descanso) { doc.text(`Descanso: ${exercicio.descanso}`, 20, currentY); currentY += 5; }
        if (exercicio.observacoes) {
          const obsLines = doc.splitTextToSize(`Obs: ${exercicio.observacoes}`, 170);
          doc.text(obsLines, 20, currentY);
          currentY += (obsLines.length * 5);
        }

        const hasTecnica = exercicio.series.some(s => !!(s as any).tecnica?.trim());
        const hasTecnicaExtra = exercicio.series.some(s => !!(s as any).tecnica_extra?.trim());

        const tableData = exercicio.series.map((serie) => {
          const tec = serie.tecnica || '-';
          const row: any[] = [serie.ordem, '-', serie.reps_sugerido || '-'];
          if (hasTecnica) row.push(tec);
          if (hasTecnicaExtra) row.push((serie as any).tecnica_extra || '-');
          return row;
        });

        const headers = ['Série', 'Peso (kg)', 'Reps'];
        if (hasTecnica) headers.push('TÉC');
        if (hasTecnicaExtra) headers.push('Técnica Extra');

        autoTable(doc, {
          startY: currentY,
          head: [headers],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9, textColor: [60, 60, 60] },
          margin: { left: 20 },
          tableWidth: 170
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      });

      const pdfBlob = doc.output('blob');
      const fileName = `${id}/${Date.now()}_${nomeFicha.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      const { error: uploadError } = await supabaseClient.storage
        .from('treinos-pdf')
        .upload(fileName, pdfBlob, { contentType: 'application/pdf', cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

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

      alert('PDF exportado com sucesso e salvo no acervo do aluno!');
    } catch (err: any) {
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
              grupo_biset_id: (ex as any).grupo_biset_id || null,
              biset_ordem: (ex as any).biset_ordem || null,
              series: ex.series.map(s => ({
                ordem: s.ordem,
                reps: s.reps_sugerido ?? null,
                tecnica: s.tecnica || null,
                tecnica_extra: (s as any).tecnica_extra || null,
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
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Carregando ficha..." />
      </div>
    );
  }

  if (!ficha) {
    return (
      <div className="min-h-screen bg-surface-0 p-6">
        <Link href={`/admin/aluno/${id}`} className="text-brand text-2xs uppercase tracking-caps inline-flex items-center gap-2 mb-6">
          <ArrowLeft size={14} /> Voltar
        </Link>
        <p className="text-danger">Ficha não encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 pb-24">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/admin/aluno/${id}`}
            className="inline-flex items-center gap-2 text-brand text-2xs uppercase tracking-caps mb-4 hover:gap-3 transition-all"
          >
            <ArrowLeft size={14} /> Voltar para Perfil
          </Link>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight uppercase mb-1">
            Editar Ficha Digital
          </h1>
          <p className="text-sm text-text-secondary">Modifique os exercícios e cargas da ficha</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-sm">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="shrink-0">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Nome da Ficha */}
        <div className="bg-surface-1 rounded-2xl p-6 border border-border-subtle shadow-elev-1 mb-6">
          <label className="text-2xs uppercase tracking-caps text-text-tertiary mb-3 block">Nome da Ficha</label>
          <input
            type="text"
            value={nomeFicha}
            onChange={(e) => setNomeFicha(e.target.value)}
            className={fieldCls}
            placeholder="Ex: Quadríceps Pesado"
          />
        </div>

        {/* Exercícios */}
        <div className="space-y-4">
          {exercicios.map((ex, exIdx) => (
            <div key={ex.id} className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-6">
              {/* Header do Exercício */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-text-primary mb-1">{ex.nome}</h3>
                  <p className="text-text-tertiary text-2xs uppercase tracking-caps">{ex.grupo_muscular || 'Exercício'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMoveExercicio(exIdx, -1)}
                    disabled={exIdx === 0}
                    className="p-2 text-text-disabled hover:text-text-secondary disabled:opacity-30 hover:bg-surface-3 rounded-lg transition-colors"
                    title="Mover para cima"
                  >
                    <CaretUp size={16} />
                  </button>
                  <button
                    onClick={() => handleMoveExercicio(exIdx, 1)}
                    disabled={exIdx === exercicios.length - 1}
                    className="p-2 text-text-disabled hover:text-text-secondary disabled:opacity-30 hover:bg-surface-3 rounded-lg transition-colors"
                    title="Mover para baixo"
                  >
                    <CaretDown size={16} />
                  </button>
                  <button
                    onClick={() => handleRemoveExercicio(exIdx)}
                    className="p-2 text-text-disabled hover:text-danger hover:bg-danger-subtle rounded-xl transition-colors ml-1"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>

              {/* Descanso + Observações */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 pb-5 border-b border-border-subtle">
                <div className="space-y-2">
                  <label className="text-2xs uppercase tracking-caps text-text-tertiary">Descanso entre Séries</label>
                  <TimeInput
                    value={ex.descanso || "01:00"}
                    onChange={(v) => {
                      const updated = [...exercicios];
                      updated[exIdx].descanso = v;
                      setExercicios(updated);
                    }}
                    className={cn(fieldCls, "text-center")}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-2xs uppercase tracking-caps text-text-tertiary">Observações para o Aluno</label>
                  <textarea
                    value={ex.observacoes || ""}
                    onChange={(e) => {
                      const updated = [...exercicios];
                      updated[exIdx].observacoes = e.target.value;
                      setExercicios(updated);
                    }}
                    placeholder="Ex: Manter o core contraído, não arquear as costas..."
                    className={cn(fieldCls, "resize-none")}
                    rows={3}
                  />
                </div>
              </div>

              {/* Séries */}
              <div className="space-y-2 mb-4">
                {/* Desktop — scrollable table */}
                <div className="hidden md:block overflow-x-auto">
                  {/* Header */}
                  <div className="grid gap-1 px-2 mb-1 min-w-max" style={{ gridTemplateColumns: `2rem 5rem 4rem 5.5rem 2rem` }}>
                    <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">#</span>
                    <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Reps</span>
                    <span className="text-2xs font-semibold uppercase tracking-caps text-brand/70">TÉC</span>
                    <span className="text-2xs font-semibold uppercase tracking-caps text-brand/70"></span>
                    <span></span>
                  </div>
                  {ex.series.map((serie, serieIdx) => (
                    <div key={serieIdx} className="grid gap-1 bg-surface-3 border border-border-subtle p-1.5 rounded-xl mb-1 min-w-max" style={{ gridTemplateColumns: `2rem 5rem 4rem 5.5rem 2rem` }}>
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-subtle text-brand text-xs font-semibold">{serie.ordem}</div>
                      <input
                        type="text"
                        value={serie.reps_sugerido}
                        onChange={(e) => handleUpdateSerie(exIdx, serieIdx, "reps_sugerido", e.target.value)}
                        placeholder="12"
                        className="w-full h-7 px-2 bg-surface-2 border border-border-default rounded-lg text-text-primary text-xs focus:outline-none focus:border-brand/40 text-center"
                      />
                      {/* TÉC */}
                      <select
                        value={(serie as any).tecnica ?? ''}
                        onChange={(e) => handleUpdateSerie(exIdx, serieIdx, "tecnica", e.target.value)}
                        className="w-full h-7 px-1 bg-surface-2 border border-brand/20 rounded-lg text-xs text-brand/80 focus:outline-none"
                      >
                        {TECNICAS_BASE_EDIT.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
                      </select>
                      {/* Técnica Extra */}
                      <select
                        value={(serie as any).tecnica_extra ?? ''}
                        onChange={(e) => handleUpdateSerie(exIdx, serieIdx, "tecnica_extra", e.target.value)}
                        className="w-full h-7 px-1 bg-surface-2 border border-brand/20 rounded-lg text-xs text-brand/80 focus:outline-none"
                      >
                        {TECNICAS_EXTRA_OPCOES_EDIT.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
                      </select>
                      <button onClick={() => handleRemoveSerie(exIdx, serieIdx)} className="flex items-center justify-center text-text-disabled hover:text-danger transition-colors">
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Mobile */}
                {ex.series.map((serie, serieIdx) => (
                  <div key={serieIdx} className="md:hidden bg-surface-3 rounded-xl border border-border-subtle p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-brand-subtle flex items-center justify-center text-brand text-xs font-semibold">{serie.ordem}</div>
                      <button onClick={() => handleRemoveSerie(exIdx, serieIdx)} className="p-1.5 text-text-disabled hover:text-danger transition-colors"><Trash size={14} /></button>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="space-y-1">
                        <label className="text-2xs uppercase tracking-caps text-text-tertiary px-1">Reps</label>
                        <input type="text" value={serie.reps_sugerido} onChange={(e) => handleUpdateSerie(exIdx, serieIdx, "reps_sugerido", e.target.value)} placeholder="12" className={cn(fieldCls, "text-center")} />
                      </div>
                    </div>
                    <div className="border-t border-border-subtle/50 pt-2">
                      <p className="text-2xs font-semibold uppercase tracking-caps text-brand/70 mb-1.5">Técnicas</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="space-y-0.5">
                          <label className="text-2xs font-semibold uppercase tracking-caps text-brand/70 px-1">TÉC</label>
                          <select
                            value={(serie as any).tecnica ?? ''}
                            onChange={(e) => handleUpdateSerie(exIdx, serieIdx, "tecnica", e.target.value)}
                            className="w-full h-8 px-2 bg-surface-2 border border-brand/20 rounded-lg text-xs text-brand/80 focus:outline-none"
                          >
                            {TECNICAS_BASE_EDIT.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
                          </select>
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-2xs font-semibold uppercase tracking-caps text-brand/70 px-1">Técnica Extra</label>
                          <select
                            value={(serie as any).tecnica_extra ?? ''}
                            onChange={(e) => handleUpdateSerie(exIdx, serieIdx, "tecnica_extra", e.target.value)}
                            className="w-full h-8 px-2 bg-surface-2 border border-brand/20 rounded-lg text-xs text-brand/80 focus:outline-none"
                          >
                            {TECNICAS_EXTRA_OPCOES_EDIT.map(opt => <option key={opt} value={opt}>{opt || '—'}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleAddSerie(exIdx)}
                className="w-full py-2 text-2xs uppercase tracking-caps text-brand border border-brand-border rounded-lg hover:bg-brand-subtle transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Adicionar Série
              </button>
            </div>
          ))}
        </div>

        {/* Adicionar Exercício */}
        <button
          onClick={() => setShowAddExercicioModal(true)}
          className="w-full mt-4 py-4 px-6 bg-brand-subtle border-2 border-dashed border-brand-border rounded-2xl text-brand text-2xs uppercase tracking-caps hover:bg-brand/10 transition-all flex items-center justify-center gap-3"
        >
          <Plus size={16} /> Adicionar Exercício do Catálogo
        </button>

        {exercicios.length === 0 && (
          <div className="mt-4 bg-surface-2 rounded-2xl p-12 text-center border border-dashed border-border-subtle">
            <p className="text-text-disabled text-2xs uppercase tracking-caps">Nenhum exercício nesta ficha</p>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button
            type="button"
            variant="secondary"
            onClick={handleExportarPDF}
            loading={exportingPDF}
            leftIcon={<FileArrowDown size={16} />}
            fullWidth
          >
            Exportar PDF
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSalvar}
            loading={saving}
            leftIcon={<FloppyDisk size={16} />}
            fullWidth
          >
            Salvar Alterações
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(`/admin/aluno/${id}`)}
            leftIcon={<X size={16} />}
            fullWidth
          >
            Cancelar
          </Button>
        </div>

        {/* Modal Adicionar Exercício */}
        {showAddExercicioModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-0/80 backdrop-blur-sm">
            <div className="bg-surface-1 rounded-2xl border border-border-default shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-surface-1 border-b border-border-subtle p-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-primary uppercase tracking-tight">Adicionar Exercício</h2>
                <button
                  onClick={() => { setShowAddExercicioModal(false); setSearchExercicio(""); }}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 border-b border-border-subtle">
                <input
                  type="text"
                  placeholder="Buscar exercício..."
                  value={searchExercicio}
                  onChange={(e) => setSearchExercicio(e.target.value)}
                  className={fieldCls}
                />
              </div>

              <div className="divide-y divide-border-subtle">
                {filteredCatalogo.length > 0 ? (
                  filteredCatalogo.map((exCatalogo) => {
                    const jáAdicionado = exercicios.some(e => e.id === exCatalogo.id);
                    return (
                      <div key={exCatalogo.id} className="p-5 hover:bg-surface-2 transition-colors flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-text-primary text-sm font-medium truncate">{exCatalogo.nome}</h3>
                          <p className="text-text-tertiary text-2xs uppercase tracking-caps mt-0.5">
                            {exCatalogo.grupo_muscular || 'Exercício'}
                          </p>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAddExercicio(exCatalogo)}
                          disabled={jáAdicionado}
                          leftIcon={<Plus size={14} />}
                        >
                          {jáAdicionado ? "Adicionado" : "Adicionar"}
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-text-disabled text-2xs uppercase tracking-caps">Nenhum exercício encontrado</p>
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
