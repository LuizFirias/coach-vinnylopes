"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { getSafeSession } from "@/lib/authErrorHandler";
import { ArrowLeft, FloppyDisk, Plus, X, FileArrowDown } from "@phosphor-icons/react";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { textIncludes } from "@/lib/utils/textNormalize";
import { ExerciseList } from "@/app/components/workout-builder/ExerciseList";
import { WorkoutPrescriptionSummary } from "@/app/components/workout-builder/WorkoutPrescriptionSummary";
import type { ExercicioFicha, SerieDefinicao } from "@/app/components/workout-builder/types";
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
import {
  alunoTreinosReturnUrl,
  readReturnUrl,
} from "@/lib/utils/adminNav";

interface Ficha {
  id: string;
  nome_rotina: string;
  configuracao: { exercicios: unknown[] };
  coach_id: string;
  aluno_id: string;
}

interface CatalogExercise {
  id: string;
  nome: string;
  grupo_muscular: string;
  tipo_exercicio?: string;
  video_url?: string;
}

const fieldCls =
  "w-full px-3 py-2 bg-surface-2 border border-input rounded-lg text-text-primary text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-all h-10";

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

function exercicioFromCatalog(ex: CatalogExercise): ExercicioFicha {
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

function catalogIdsInFicha(items: ExercicioFichaItem[]): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    if (isBiSetFichaItem(item)) {
      ids.add(item.exercicioA.exercicio_id);
      if (item.exercicioB) ids.add(item.exercicioB.exercicio_id);
    } else {
      ids.add(item.id);
    }
  }
  return ids;
}

export default function EditarFichaPage({ params }: { params: Promise<{ id: string; fichaId: string }> }) {
  const router = useRouter();
  const { id, fichaId } = use(params);

  const goBack = useCallback(() => {
    const fallback = alunoTreinosReturnUrl(id);
    const target =
      typeof window !== "undefined"
        ? readReturnUrl(window.location.search, fallback)
        : fallback;
    router.push(target);
  }, [id, router]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nomeFicha, setNomeFicha] = useState("");
  const [items, setItems] = useState<ExercicioFichaItem[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogExercise[]>([]);
  const [bisetToast, setBisetToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(new Set());
  const [searchExercicio, setSearchExercicio] = useState("");

  const showBisetToast = useCallback((msg: string) => {
    setBisetToast(msg);
    setTimeout(() => setBisetToast(null), 3500);
  }, []);

  useEffect(() => {
    void loadData();
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

      const ficha = fichaData as Ficha;
      setNomeFicha(ficha.nome_rotina || "");
      setItems(parseFichaItems(ficha.configuracao?.exercicios || []));

      const { data: catalogoData } = await supabaseClient
        .from("exercicios_biblioteca")
        .select("id, nome, grupo_muscular, video_url, tipo_exercicio")
        .order("nome", { ascending: true });

      setCatalogo(catalogoData || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar ficha");
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setItems(next);
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

  const selecionarParceiroBiSet = (index: number, ex: CatalogExercise) => {
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
      const simples = bisetGroupToSimples(item);
      const next = [...prev];
      next.splice(index, 1, ...simples);
      return next;
    });
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

  const atualizarSerie = (exIndex: number, serieIndex: number, campo: string, valor: unknown) => {
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
      const proximaOrdem = series.length > 0 ? Math.max(...series.map((s) => s.ordem)) + 1 : 1;
      const modelo = series[series.length - 1] || {
        reps_sugerido: "12",
        tempo_sugerido: "01:00",
        tecnica: "",
        tecnica_extra: "",
        peso_sugerido: null,
      };
      next[exIndex] = { ...item, series: [...series, { ...modelo, ordem: proximaOrdem }] };
      return next;
    });
  };

  const removerSerie = (exIndex: number, serieIndex: number) => {
    setItems((prev) => {
      const item = prev[exIndex];
      if (!item || isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      const series = item.series.filter((_, i) => i !== serieIndex).map((s, i) => ({ ...s, ordem: i + 1 }));
      next[exIndex] = { ...item, series };
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

  const atualizarBiSetHalf = (index: number, half: "a" | "b", patch: { nome?: string; observacoes?: string }) => {
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

  const atualizarBiSetSerie = (index: number, half: "a" | "b", serieIndex: number, campo: string, valor: unknown) => {
    if (campo === "tecnica_extra" && valor === "Bi-Set") return;
    setItems((prev) => {
      const item = prev[index];
      if (!item || !isBiSetFichaItem(item)) return prev;
      const next = [...prev];
      const group = {
        ...item,
        exercicioA: { ...item.exercicioA, series: [...item.exercicioA.series] },
        exercicioB: item.exercicioB
          ? { ...item.exercicioB, series: [...item.exercicioB.series] }
          : item.exercicioB,
      };
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
    showBisetToast("Em Bi-Sets, séries são adicionadas e removidas em par. Ambos os exercícios foram atualizados.");
  };

  const toggleSelectExercise = (exerciseId: string) => {
    setSelectedExerciseIds((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
  };

  const handleAddSelectedExercises = () => {
    if (selectedExerciseIds.size === 0) {
      setShowAddModal(false);
      return;
    }
    const novos: ExercicioFicha[] = [];
    selectedExerciseIds.forEach((exId) => {
      const ex = catalogo.find((e) => e.id === exId);
      if (ex) novos.push(exercicioFromCatalog(ex));
    });
    setItems((prev) => [...prev, ...novos]);
    setSelectedExerciseIds(new Set());
    setShowAddModal(false);
    setSearchExercicio("");
  };

  const filteredCatalogo = catalogo.filter(
    (ex) =>
      textIncludes(ex.nome, searchExercicio) ||
      textIncludes(ex.grupo_muscular, searchExercicio)
  );

  const idsNaFicha = catalogIdsInFicha(items);

  const handleExportarPDF = async () => {
    if (!nomeFicha.trim() || items.length === 0) {
      setError("Preencha os dados da ficha antes de exportar");
      return;
    }

    setExportingPDF(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const coachId = (await getSafeSession())?.user?.id;
      if (!coachId) throw new Error("Sessão inválida");

      const { data: alunoData } = await supabaseClient
        .from("profiles")
        .select("coaching_reference, email")
        .eq("id", id)
        .single();

      const nomeAluno = alunoData?.coaching_reference || alunoData?.email || "Aluno";
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      doc.setFontSize(20);
      doc.text("FICHA DE TREINO", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text(nomeFicha, 105, 28, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Atleta: ${nomeAluno}`, 20, 40);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 20, 46);
      doc.line(20, 50, 190, 50);

      let currentY = 58;

      items.forEach((item, index) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

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
      const fileName = `${id}/${Date.now()}_${nomeFicha.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

      const { error: uploadError } = await supabaseClient.storage
        .from("treinos-pdf")
        .upload(fileName, pdfBlob, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabaseClient.from("treinos_alunos").insert({
        aluno_id: id,
        coach_id: coachId,
        url_pdf: fileName,
        nome_arquivo: `${nomeFicha}.pdf`,
        data_upload: new Date().toISOString(),
      });

      if (dbError) throw dbError;
      alert("PDF exportado com sucesso e salvo no acervo do aluno!");
    } catch (err: unknown) {
      setError("Erro ao exportar PDF: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setExportingPDF(false);
    }
  };

  const handleSalvar = async () => {
    if (!nomeFicha.trim()) {
      setError("Nome da ficha é obrigatório");
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

    setSaving(true);
    try {
      const { error: saveError } = await supabaseClient
        .from("fichas_treino")
        .update({
          nome_rotina: nomeFicha,
          configuracao: { exercicios: serializeFichaItems(items) },
        })
        .eq("id", fichaId);

      if (saveError) throw saveError;
      goBack();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar ficha");
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

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:pl-28 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 py-4 border-b border-divider flex flex-col gap-2.5">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1.5 text-text-secondary hover:text-brand text-xs transition-colors mb-1"
          >
            <ArrowLeft size={14} /> Voltar para Perfil
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-danger-subtle border border-danger-border text-danger text-xs font-semibold">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        {bisetToast && (
          <div className="mb-4 px-3 py-2.5 bg-[#1a2d4a] border-l-[3px] border-brand rounded-lg text-xs text-text-primary">
            {bisetToast}
          </div>
        )}

        <div className="bg-surface-1 rounded-xl p-4 md:p-5 border-0 shadow-sm mb-4">
          <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-2 block">
            Nome da Ficha
          </label>
          <input
            type="text"
            value={nomeFicha}
            onChange={(e) => setNomeFicha(e.target.value)}
            className={fieldCls}
            placeholder="Ex: Quadríceps Pesado"
          />
        </div>

        <WorkoutPrescriptionSummary items={items} className="mb-4" />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">
            Exercícios <span className="text-brand">({items.length})</span>
          </h2>
        </div>

        {items.length === 0 ? (
          <div className="bg-surface-1 rounded-xl p-8 text-center border border-dashed border-divider mb-4">
            <p className="text-text-disabled text-xs font-semibold uppercase tracking-wider">
              Nenhum exercício nesta ficha
            </p>
          </div>
        ) : (
          <ExerciseList
            items={items}
            catalog={catalogo}
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
          />
        )}

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="mt-4 w-full py-3 px-6 bg-surface-1 border border-dashed border-brand-border/30 rounded-xl text-brand text-xs font-bold hover:bg-brand-subtle/40 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={14} weight="bold" /> Adicionar Exercício do Catálogo
        </button>

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button
            type="button"
            variant="secondary"
            className="h-10 text-xs rounded-lg flex-1"
            onClick={handleExportarPDF}
            loading={exportingPDF}
            leftIcon={<FileArrowDown size={14} />}
          >
            Exportar PDF
          </Button>
          <Button
            type="button"
            variant="primary"
            className="h-10 text-xs rounded-lg flex-1"
            onClick={handleSalvar}
            loading={saving}
            leftIcon={<FloppyDisk size={14} />}
          >
            Salvar Alterações
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-10 text-xs rounded-lg flex-1"
            onClick={goBack}
            leftIcon={<X size={14} />}
          >
            Cancelar
          </Button>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-0/80 backdrop-blur-sm">
            <div className="bg-surface-1 rounded-xl border-0 shadow-2xl max-w-xl w-full max-h-[80vh] flex flex-col overflow-hidden">
              <div className="bg-surface-1 border-b border-divider p-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-text-primary">Adicionar Exercício</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSearchExercicio("");
                  }}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-3 border-b border-divider">
                <input
                  type="text"
                  placeholder="Buscar exercício..."
                  value={searchExercicio}
                  onChange={(e) => setSearchExercicio(e.target.value)}
                  className="w-full px-3 py-1.5 h-10 bg-surface-2 border border-input rounded-md text-text-primary text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-all"
                />
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-border-subtle">
                {filteredCatalogo.length > 0 ? (
                  filteredCatalogo.map((exCatalogo) => {
                    const jaAdicionado = idsNaFicha.has(exCatalogo.id);
                    const isSelected = selectedExerciseIds.has(exCatalogo.id);
                    return (
                      <button
                        key={exCatalogo.id}
                        type="button"
                        onClick={() => {
                          if (jaAdicionado) return;
                          toggleSelectExercise(exCatalogo.id);
                        }}
                        disabled={jaAdicionado}
                        className={cn(
                          "w-full p-4 hover:bg-surface-2 transition-colors flex items-center justify-between gap-4 text-left border-b border-divider/50",
                          isSelected && "bg-brand/5 border-l-2 border-l-brand",
                          jaAdicionado && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <h3
                            className={cn(
                              "text-xs font-bold truncate",
                              isSelected ? "text-brand" : "text-text-primary"
                            )}
                          >
                            {exCatalogo.nome}
                          </h3>
                          <p className="text-text-tertiary text-[9px] font-bold uppercase tracking-wider mt-0.5">
                            {exCatalogo.grupo_muscular || "Exercício"}
                          </p>
                        </div>
                        {jaAdicionado ? (
                          <span className="text-[10px] text-text-disabled font-semibold">Na ficha</span>
                        ) : isSelected ? (
                          <span className="w-4 h-4 rounded-full bg-brand flex items-center justify-center text-[9px] text-text-on-brand font-bold">
                            ✓
                          </span>
                        ) : (
                          <span className="w-4 h-4 rounded-full border-0 flex items-center justify-center text-[10px] text-text-tertiary font-bold">
                            +
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="p-10 text-center">
                    <p className="text-text-disabled text-xs font-semibold uppercase tracking-wider">
                      Nenhum exercício encontrado
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-divider bg-surface-2/40 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedExerciseIds(new Set());
                    setShowAddModal(false);
                  }}
                  className="px-4 py-2 bg-surface-3 hover:bg-surface-4 text-text-primary rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddSelectedExercises}
                  disabled={selectedExerciseIds.size === 0}
                  className="px-4 py-2 bg-brand disabled:opacity-40 text-text-on-brand rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Adicionar ({selectedExerciseIds.size})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
