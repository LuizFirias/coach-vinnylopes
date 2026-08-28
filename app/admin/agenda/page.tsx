"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CaretLeft, CaretRight, Clock, Briefcase, MapPin, VideoCamera, Trash, Check, CheckCircle, XCircle, X } from "@phosphor-icons/react";
import { supabaseClient } from "@/lib/supabaseClient";
import { getSafeSession } from "@/lib/authErrorHandler";
import { StudentAvatar } from "@/app/components/profile/StudentAvatar";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { cn } from "@/lib/utils/cn";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import {
  fetchAgendaRange,
  fetchAulasPendentes,
  fetchAulasPorStatus,
  marcarConcluida,
  marcarFalta,
  excluirAula,
  type AulaAgenda,
  type ItemTipo,
} from "@/lib/agenda/queries";
import {
  addDays,
  addMonths,
  getMonday,
  getMonthGridDays,
  getWeekDays,
  isSameDay,
  formatMonthLabel,
  rangeForPeriodo,
  bucketRange,
  type PeriodoFiltro,
} from "@/lib/agenda/dateHelpers";
import { GridCalendar } from "./components/GridCalendar";
import { MonthCalendar } from "./components/MonthCalendar";
import { YearCalendar } from "./components/YearCalendar";
import { CreateMenu } from "./components/CreateMenu";
import { CreateItemModal } from "./components/CreateItemModal";
import { HorarioTrabalhoModal } from "./components/HorarioTrabalhoModal";
import { FaltaPopover } from "./components/FaltaPopover";
import { AulasBarChart, type AulasBarChartDatum } from "./components/AulasBarChart";

type ViewMode = "dia" | "semana" | "mes" | "ano";

interface AlunoOption {
  id: string;
  nome: string;
}

const STATS_PERIODO_OPTIONS = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "3meses", label: "Últimos 3 meses" },
];

const CHART_PERIODO_OPTIONS = [
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "3meses", label: "Últimos 3 meses" },
  { value: "personalizado", label: "Personalizado" },
];

/** Só aulas que já passaram do horário podem ser marcadas feita/falta — uma
 *  futura só pode ser desmarcada (excluída), nunca "confirmada" com antecedência. */
function isPastAula(dataHoraISO: string): boolean {
  return new Date(dataHoraISO).getTime() <= Date.now();
}

function formatDiaHora(iso: string): { dia: string; hora: string } {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return { dia, hora };
}

export default function AgendaPage() {
  const [loading, setLoading] = useState(true);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [alunos, setAlunos] = useState<AlunoOption[]>([]);

  const [view, setView] = useState<ViewMode>("dia");
  const [anchor, setAnchor] = useState(new Date());

  // Trocar de visão (dia/semana/mês/ano) sempre volta pro dia atual — senão
  // navegar 2 semanas pra frente em "semana" e voltar pra "dia" abriria num
  // dia qualquer daquela semana, em vez do dia de hoje.
  const changeView = useCallback((v: ViewMode) => {
    setView(v);
    setAnchor(new Date());
  }, []);
  const [rangeItems, setRangeItems] = useState<AulaAgenda[]>([]);
  const [aulasPendentes, setAulasPendentes] = useState<AulaAgenda[]>([]);

  // Cards "Aulas feitas/canceladas" e o gráfico têm período próprio, independente
  // da navegação do calendário principal (dia/semana/mês/ano acima).
  const [statsFiltro, setStatsFiltro] = useState<PeriodoFiltro>("semana");
  const [statsItems, setStatsItems] = useState<AulaAgenda[]>([]);
  const [chartFiltro, setChartFiltro] = useState<PeriodoFiltro | "personalizado">("semana");
  const [chartCustomStart, setChartCustomStart] = useState("");
  const [chartCustomEnd, setChartCustomEnd] = useState("");
  const [chartItems, setChartItems] = useState<AulaAgenda[]>([]);

  // Clicar em "Aulas feitas"/"Aulas canceladas" substitui a lista "Próximas
  // aulas" por essas últimas 30, como um filtro — X no card volta ao padrão.
  const [listaFiltro, setListaFiltro] = useState<"concluida" | "cancelada" | null>(null);
  const [listaFiltroItems, setListaFiltroItems] = useState<AulaAgenda[]>([]);

  const [createOpen, setCreateOpen] = useState<{ tipo: ItemTipo; date?: string; time?: string } | null>(null);
  const [horarioOpen, setHorarioOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AulaAgenda | null>(null);
  const [desmarcarConfirm, setDesmarcarConfirm] = useState<AulaAgenda | null>(null);

  const loadAlunos = useCallback(async (uid: string) => {
    const result = await supabaseClient
      .from("coach_alunos")
      .select("aluno:profiles!aluno_id(id, full_name, coaching_reference)")
      .eq("coach_id", uid)
      .limit(200);

    const list = ((result.data ?? []) as unknown as Array<{
      aluno: { id: string; full_name: string | null; coaching_reference: string | null } | null;
    }>)
      .map((r) => r.aluno)
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => ({ id: a.id, nome: a.coaching_reference || a.full_name || "Sem nome" }));
    setAlunos(list);
  }, []);

  // Intervalo de busca de acordo com a visão ativa
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (view === "dia") {
      const start = new Date(anchor);
      start.setHours(0, 0, 0, 0);
      return { rangeStart: start, rangeEnd: addDays(start, 1) };
    }
    if (view === "semana") {
      const start = getMonday(anchor);
      return { rangeStart: start, rangeEnd: addDays(start, 7) };
    }
    if (view === "mes") {
      const gridDays = getMonthGridDays(anchor);
      return { rangeStart: gridDays[0], rangeEnd: addDays(gridDays[41], 1) };
    }
    // ano
    const start = new Date(anchor.getFullYear(), 0, 1);
    const end = new Date(anchor.getFullYear() + 1, 0, 1);
    return { rangeStart: start, rangeEnd: end };
  }, [view, anchor]);

  // Texto do botão central — "Hoje" só quando o período mostrado realmente
  // contém hoje; senão mostra o próprio período (dia/semana/mês/ano visível).
  const periodLabel = useMemo(() => {
    if (view === "dia") {
      if (isSameDay(anchor, new Date())) return "Hoje";
      const nomeDia = anchor.toLocaleDateString("pt-BR", { weekday: "long" });
      const capitalizado = nomeDia.charAt(0).toUpperCase() + nomeDia.slice(1);
      return `${capitalizado} - ${anchor.getDate()}`;
    }
    if (view === "semana") {
      const start = getMonday(anchor);
      const end = addDays(start, 6);
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} - ${end.getDate()}`;
      }
      const mesInicio = start.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const mesFim = end.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      return `${start.getDate()} ${mesInicio} - ${end.getDate()} ${mesFim}`;
    }
    if (view === "mes") {
      const label = anchor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    // ano
    return String(anchor.getFullYear());
  }, [view, anchor]);

  const loadRangeItems = useCallback(
    async (uid: string) => {
      const items = await fetchAgendaRange(uid, rangeStart.toISOString(), rangeEnd.toISOString());
      setRangeItems(items);
    },
    [rangeStart, rangeEnd],
  );

  const loadAulasPendentes = useCallback(async (uid: string) => {
    setAulasPendentes(await fetchAulasPendentes(uid));
  }, []);

  // Janela do filtro dos cards "Aulas feitas/canceladas" — sempre relativa a
  // agora, não à navegação do calendário principal (independente por pedido).
  const { start: statsStart, end: statsEnd } = useMemo(() => rangeForPeriodo(statsFiltro), [statsFiltro]);

  const loadStatsItems = useCallback(
    async (uid: string) => {
      setStatsItems(await fetchAgendaRange(uid, statsStart.toISOString(), statsEnd.toISOString()));
    },
    [statsStart, statsEnd],
  );

  // Janela do filtro do gráfico — "personalizado" usa as datas escolhidas
  // (só busca quando as 2 estiverem preenchidas).
  const chartRange = useMemo(() => {
    if (chartFiltro === "personalizado") {
      if (!chartCustomStart || !chartCustomEnd) return null;
      const start = new Date(`${chartCustomStart}T00:00:00`);
      const end = addDays(new Date(`${chartCustomEnd}T00:00:00`), 1);
      return { start, end };
    }
    return rangeForPeriodo(chartFiltro);
  }, [chartFiltro, chartCustomStart, chartCustomEnd]);

  const loadChartItems = useCallback(
    async (uid: string) => {
      if (!chartRange) return;
      setChartItems(await fetchAgendaRange(uid, chartRange.start.toISOString(), chartRange.end.toISOString()));
    },
    [chartRange],
  );

  const loadListaFiltroItems = useCallback(async (uid: string, status: "concluida" | "cancelada") => {
    setListaFiltroItems(await fetchAulasPorStatus(uid, status));
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const session = await getSafeSession();
      const uid = session?.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      setCoachId(uid);
      await Promise.all([loadAlunos(uid), loadAulasPendentes(uid)]);
      setLoading(false);
    })();
  }, [loadAlunos, loadAulasPendentes]);

  useEffect(() => {
    if (!coachId) return;
    void loadRangeItems(coachId);
  }, [coachId, loadRangeItems]);

  useEffect(() => {
    if (!coachId) return;
    void loadStatsItems(coachId);
  }, [coachId, loadStatsItems]);

  useEffect(() => {
    if (!coachId) return;
    void loadChartItems(coachId);
  }, [coachId, loadChartItems]);

  useEffect(() => {
    if (!coachId || !listaFiltro) return;
    void loadListaFiltroItems(coachId, listaFiltro);
  }, [coachId, listaFiltro, loadListaFiltroItems]);

  const refreshAll = useCallback(() => {
    if (!coachId) return;
    void loadRangeItems(coachId);
    void loadAulasPendentes(coachId);
    void loadStatsItems(coachId);
    void loadChartItems(coachId);
    if (listaFiltro) void loadListaFiltroItems(coachId, listaFiltro);
  }, [coachId, loadRangeItems, loadAulasPendentes, loadStatsItems, loadChartItems, listaFiltro, loadListaFiltroItems]);

  const navigate = (dir: -1 | 1) => {
    if (view === "dia") setAnchor((a) => addDays(a, dir));
    else if (view === "semana") setAnchor((a) => addDays(a, dir * 7));
    else if (view === "mes") setAnchor((a) => addMonths(a, dir));
    else setAnchor((a) => new Date(a.getFullYear() + dir, a.getMonth(), 1));
  };

  const openCreateAt = (date: Date, hour: number) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    setCreateOpen({
      tipo: "aula",
      date: `${yyyy}-${mm}-${dd}`,
      time: `${String(hour).padStart(2, "0")}:00`,
    });
  };

  const handleMarcarConcluida = async (id: string) => {
    await marcarConcluida(id);
    if (selectedItem?.id === id) setSelectedItem(null);
    refreshAll();
  };

  const handleMarcarFalta = async (id: string, faltaDe: "coach" | "aluno") => {
    await marcarFalta(id, faltaDe);
    if (selectedItem?.id === id) setSelectedItem(null);
    refreshAll();
  };

  const handleExcluir = async (id: string) => {
    await excluirAula(id);
    setDesmarcarConfirm(null);
    if (selectedItem?.id === id) setSelectedItem(null);
    refreshAll();
  };

  // Contagens dos cards — período próprio (statsFiltro), independente do calendário
  const { aulasFeitas, aulasCanceladas } = useMemo(() => {
    const aulas = statsItems.filter((i) => i.tipo === "aula");
    return {
      aulasFeitas: aulas.filter((i) => i.status === "concluida").length,
      aulasCanceladas: aulas.filter((i) => i.status === "cancelada").length,
    };
  }, [statsItems]);

  // Categorias do gráfico — período próprio (chartFiltro), granularidade automática
  const chartData: AulasBarChartDatum[] = useMemo(() => {
    if (!chartRange) return [];
    const aulas = chartItems.filter((i) => i.tipo === "aula");
    return bucketRange(chartRange.start, chartRange.end).map(({ categoria, from, to }) => ({
      categoria,
      feitas: aulas.filter((i) => i.status === "concluida" && new Date(i.data_hora) >= from && new Date(i.data_hora) < to).length,
      naoFeitas: aulas.filter((i) => i.status === "cancelada" && new Date(i.data_hora) >= from && new Date(i.data_hora) < to).length,
    }));
  }, [chartItems, chartRange]);

  // Agrupa a lista feitas/canceladas por mês, mais antiga → mais recente (já vem assim)
  const listaFiltroPorMes = useMemo(() => {
    const grupos: { mes: string; itens: AulaAgenda[] }[] = [];
    for (const item of listaFiltroItems) {
      const mes = formatMonthLabel(new Date(item.data_hora));
      const ultimo = grupos[grupos.length - 1];
      if (ultimo?.mes === mes) ultimo.itens.push(item);
      else grupos.push({ mes, itens: [item] });
    }
    return grupos;
  }, [listaFiltroItems]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <DumbbellLoader text="Carregando agenda..." variant="inline" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-3 text-text-primary font-sans md:px-8 md:pt-4 lg:px-10 lg:pl-8 lg:pt-4">
      <div className="mx-auto w-full max-w-[min(1600px,96vw)]">
        {/* Barra superior — mesmo grid [1fr_320px] do conteúdo abaixo, então tudo alinha */}
        <div className="mb-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="relative flex min-w-0 items-center justify-between gap-3">
            <CreateMenu onSelect={(tipo) => setCreateOpen({ tipo })} />

            {/* Centralizado de verdade entre o Criar e o filtro — não depende da largura dos dois lados */}
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:bg-surface-2 hover:text-text-primary"
                aria-label="Anterior"
              >
                <CaretLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setAnchor(new Date())}
                className="whitespace-nowrap rounded-lg px-2.5 py-1 text-sm font-medium text-text-secondary hover:bg-surface-2"
              >
                {periodLabel}
              </button>
              <button
                type="button"
                onClick={() => navigate(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:bg-surface-2 hover:text-text-primary"
                aria-label="Próximo"
              >
                <CaretRight size={16} />
              </button>
            </div>

            {/* Final alinhado com o final do calendário (mesma coluna 1fr) */}
            <div className="flex shrink-0 items-center gap-1 rounded-lg border border-[#E4E7ED] bg-white p-1">
              {(["dia", "semana", "mes", "ano"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => changeView(v)}
                  className={
                    "rounded-md px-2.5 py-1.5 text-xs font-semibold capitalize transition-colors " +
                    (view === v ? "bg-brand text-white" : "text-text-secondary hover:bg-surface-2")
                  }
                >
                  {v === "mes" ? "Mês" : v}
                </button>
              ))}
            </div>
          </div>

          {/* No lugar onde o filtro estava antes — agora só o ícone, com tooltip no hover */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setHorarioOpen(true)}
              title="Configurar horário de trabalho"
              aria-label="Configurar horário de trabalho"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E7ED] bg-white text-text-secondary hover:text-brand"
            >
              <Briefcase size={16} />
            </button>
          </div>
        </div>

        {/* Calendário + coluna lateral */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div
            className="rounded-xl border-0 bg-surface-1 p-4"
            style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.14)" }}
          >
            {(view === "dia" || view === "semana") && (
              <GridCalendar
                days={view === "dia" ? [anchor] : getWeekDays(anchor)}
                items={rangeItems}
                onSlotClick={openCreateAt}
                onItemClick={setSelectedItem}
              />
            )}
            {view === "mes" && (
              <MonthCalendar
                anchor={anchor}
                items={rangeItems}
                onDayClick={(day) => {
                  setAnchor(day);
                  setView("dia");
                }}
              />
            )}
            {view === "ano" && (
              <YearCalendar
                year={anchor.getFullYear()}
                items={rangeItems}
                onMonthClick={(month) => {
                  setAnchor(new Date(anchor.getFullYear(), month, 1));
                  setView("mes");
                }}
              />
            )}

            {/* Só desktop por enquanto */}
            <div className="hidden lg:block">
              <AulasBarChart
                data={chartData}
                filtro={
                  <div className="flex shrink-0 items-center gap-1.5">
                    <div className="w-32">
                      <Select
                        size="sm"
                        value={chartFiltro}
                        onChange={(v) => setChartFiltro(v as PeriodoFiltro | "personalizado")}
                        options={CHART_PERIODO_OPTIONS}
                      />
                    </div>
                    {chartFiltro === "personalizado" && (
                      <div className="flex items-center gap-1">
                        <div className="w-32">
                          <DatePickerField value={chartCustomStart} onChange={setChartCustomStart} placeholder="De" />
                        </div>
                        <div className="w-32">
                          <DatePickerField value={chartCustomEnd} onChange={setChartCustomEnd} placeholder="Até" />
                        </div>
                      </div>
                    )}
                  </div>
                }
              />
            </div>
          </div>

          {/* Coluna lateral — mesmo padrão do card do dashboard, um pouco mais estreita */}
          <div className="flex flex-col gap-4">
            {/* Filtro dos 2 cards abaixo — só desktop por enquanto */}
            <div className="hidden justify-center lg:flex">
              <div className="w-36">
                <Select
                  size="sm"
                  value={statsFiltro}
                  onChange={(v) => setStatsFiltro(v as PeriodoFiltro)}
                  options={STATS_PERIODO_OPTIONS}
                />
              </div>
            </div>

            {/* Aulas feitas × canceladas no período — clicáveis, filtram a lista abaixo — só desktop por enquanto */}
            <div className="hidden gap-3 lg:grid lg:grid-cols-2">
              <button
                type="button"
                onClick={() => setListaFiltro("concluida")}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-2xl border-0 px-4 py-3 text-left transition-all hover:opacity-90",
                  listaFiltro === "concluida"
                    ? "bg-success/10 ring-2 ring-success"
                    : "bg-surface-1",
                )}
                style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.14)" }}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                    Aulas feitas
                  </p>
                  <p className="text-xl font-extrabold tabular-nums leading-none text-success">
                    {aulasFeitas}
                  </p>
                </div>
                <CheckCircle
                  size={20}
                  weight="fill"
                  className={cn("shrink-0", listaFiltro === "concluida" ? "text-success" : "text-success/70")}
                />
              </button>
              <button
                type="button"
                onClick={() => setListaFiltro("cancelada")}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-2xl border-0 px-4 py-3 text-left transition-all hover:opacity-90",
                  listaFiltro === "cancelada"
                    ? "bg-danger/10 ring-2 ring-danger"
                    : "bg-surface-1",
                )}
                style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.14)" }}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                    Aulas canceladas
                  </p>
                  <p className="text-xl font-extrabold tabular-nums leading-none text-danger">
                    {aulasCanceladas}
                  </p>
                </div>
                <XCircle
                  size={20}
                  weight="fill"
                  className={cn("shrink-0", listaFiltro === "cancelada" ? "text-danger" : "text-danger/70")}
                />
              </button>
            </div>

            <div
              className="flex min-h-0 flex-1 flex-col rounded-xl border-0 bg-surface-1 p-4"
              style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.14)" }}
            >
              <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                <h2 className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                  {listaFiltro === "concluida"
                    ? "Aulas feitas"
                    : listaFiltro === "cancelada"
                      ? "Aulas canceladas"
                      : "Próximas aulas"}
                </h2>
                {listaFiltro && (
                  <button
                    type="button"
                    onClick={() => setListaFiltro(null)}
                    title="Voltar pra próximas aulas"
                    aria-label="Voltar pra próximas aulas"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary transition-colors hover:text-text-primary"
                  >
                    <X size={14} weight="bold" />
                  </button>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {listaFiltro ? (
                  listaFiltroPorMes.length === 0 ? (
                    <p className="text-xs text-text-disabled">
                      {listaFiltro === "concluida" ? "Nenhuma aula feita ainda." : "Nenhuma aula cancelada ainda."}
                    </p>
                  ) : (
                    listaFiltroPorMes.map((grupo) => (
                      <div key={grupo.mes} className="mb-1">
                        <p className="sticky top-0 bg-surface-1 py-1 text-[9px] font-bold uppercase tracking-wider text-text-tertiary">
                          {grupo.mes}
                        </p>
                        <div className="flex flex-col">
                          {grupo.itens.map((aula) => {
                            const { dia, hora } = formatDiaHora(aula.data_hora);
                            const nome = aula.aluno?.coaching_reference || aula.aluno?.full_name || "Aluno";
                            return (
                              <button
                                key={aula.id}
                                type="button"
                                onClick={() => setSelectedItem(aula)}
                                className="flex items-center gap-2.5 rounded-lg border-b border-border-divider/40 p-1.5 text-left transition-colors last:border-0 hover:bg-surface-2/60"
                              >
                                <StudentAvatar
                                  name={nome}
                                  avatarUrl={aula.aluno?.avatar_url}
                                  sexo={aula.aluno?.sexo}
                                  sizeClassName="h-8 w-8"
                                  className="rounded-lg shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-semibold text-text-primary">{nome}</p>
                                  <p className="truncate text-[10px] text-text-tertiary capitalize">
                                    {dia} · {hora}
                                    {aula.status === "cancelada" && aula.falta_de && (
                                      <> · {aula.falta_de === "coach" ? "falta minha" : "falta do aluno"}</>
                                    )}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )
                ) : aulasPendentes.length === 0 ? (
                  <p className="text-xs text-text-disabled">Nenhuma aula pendente de marcação.</p>
                ) : (
                  <div className="flex flex-col">
                    {aulasPendentes.slice(0, 8).map((aula) => {
                      const { dia, hora } = formatDiaHora(aula.data_hora);
                      const nome =
                        aula.aluno?.coaching_reference || aula.aluno?.full_name || "Aluno";
                      return (
                        <div
                          key={aula.id}
                          className="flex items-center gap-1.5 border-b border-border-divider/40 py-1 last:border-0"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedItem(aula)}
                            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-surface-2/60"
                          >
                            <StudentAvatar
                              name={nome}
                              avatarUrl={aula.aluno?.avatar_url}
                              sexo={aula.aluno?.sexo}
                              sizeClassName="h-8 w-8"
                              className="rounded-lg shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-text-primary">{nome}</p>
                              <p className="truncate text-[10px] text-text-tertiary capitalize">
                                {dia} · {hora}
                              </p>
                            </div>
                          </button>

                          <div className="flex shrink-0 items-center gap-0.5">
                            {isPastAula(aula.data_hora) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void handleMarcarConcluida(aula.id)}
                                  title="Marcar como feita"
                                  aria-label="Marcar como feita"
                                  className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:text-success"
                                >
                                  <Check size={14} weight="bold" />
                                </button>
                                <FaltaPopover onPick={(faltaDe) => void handleMarcarFalta(aula.id, faltaDe)} className="h-7 w-7" />
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setDesmarcarConfirm(aula)}
                              title="Desmarcar aula"
                              aria-label="Desmarcar aula"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:text-danger"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {createOpen && coachId && (
        <CreateItemModal
          coachId={coachId}
          tipoInicial={createOpen.tipo}
          alunos={alunos}
          initialDate={createOpen.date}
          initialTime={createOpen.time}
          onClose={() => setCreateOpen(null)}
          onCreated={() => {
            setCreateOpen(null);
            refreshAll();
          }}
        />
      )}

      {horarioOpen && coachId && (
        <HorarioTrabalhoModal coachId={coachId} onClose={() => setHorarioOpen(false)} />
      )}

      {selectedItem && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setSelectedItem(null)} />
          <div
            className="relative w-full max-w-sm rounded-2xl bg-surface-1 p-5"
            style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.14)" }}
          >
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              title="Fechar"
              aria-label="Fechar"
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:text-text-primary"
            >
              <X size={16} weight="bold" />
            </button>

            <p className="mb-1 pr-7 text-sm font-bold text-text-primary">
              {selectedItem.tipo === "evento"
                ? selectedItem.titulo || "Evento"
                : selectedItem.aluno?.coaching_reference || selectedItem.aluno?.full_name || "Aluno"}
            </p>
            <p className="mb-4 flex items-center gap-1.5 text-xs text-text-tertiary">
              <Clock size={12} />
              {new Date(selectedItem.data_hora).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {selectedItem.tipo === "aula" && (
                <>
                  <span>·</span>
                  {selectedItem.local_tipo === "online" ? (
                    <VideoCamera size={12} />
                  ) : (
                    <MapPin size={12} />
                  )}
                  {selectedItem.local_tipo === "online" ? "Online" : selectedItem.endereco || "Presencial"}
                </>
              )}
            </p>
            {selectedItem.tipo === "aula" ? (
              isPastAula(selectedItem.data_hora) ? (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    className="h-9 w-full"
                    leftIcon={<Check size={13} weight="bold" />}
                    onClick={() => void handleMarcarConcluida(selectedItem.id)}
                  >
                    Concluir
                  </Button>
                  <div className="flex items-center gap-2">
                    <FaltaPopover
                      onPick={(faltaDe) => void handleMarcarFalta(selectedItem.id, faltaDe)}
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-subtle text-xs font-semibold text-text-secondary transition-colors hover:border-danger hover:text-danger"
                    >
                      <XCircle size={13} weight="bold" /> Marcar falta
                    </FaltaPopover>
                    <Button
                      variant="danger"
                      size="sm"
                      className="h-9 flex-1"
                      leftIcon={<Trash size={13} />}
                      onClick={() => void handleExcluir(selectedItem.id)}
                    >
                      Desmarcar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mb-2 text-[10px] text-text-tertiary">
                    Aula ainda não aconteceu — só é possível desmarcar.
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    className="h-9 w-full"
                    leftIcon={<Trash size={13} />}
                    onClick={() => void handleExcluir(selectedItem.id)}
                  >
                    Desmarcar
                  </Button>
                </>
              )
            ) : (
              <Button
                variant="danger"
                size="sm"
                className="h-9 w-full"
                leftIcon={<Trash size={13} />}
                onClick={() => void handleExcluir(selectedItem.id)}
              >
                Excluir
              </Button>
            )}
          </div>
        </div>,
        document.body,
      )}

      {desmarcarConfirm && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setDesmarcarConfirm(null)} />
          <div
            className="relative w-full max-w-sm rounded-2xl bg-surface-1 p-5"
            style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.14)" }}
          >
            <p className="mb-1 text-sm font-bold text-text-primary">Desmarcar esta aula?</p>
            <p className="mb-4 text-xs text-text-tertiary">
              Ela deixa de existir na agenda — não conta como feita nem como falta, e não entra
              nas estatísticas. Se o objetivo é registrar uma falta, use o X em vez da lixeira.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 border border-border-subtle"
                onClick={() => setDesmarcarConfirm(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                leftIcon={<Trash size={13} />}
                onClick={() => void handleExcluir(desmarcarConfirm.id)}
              >
                Desmarcar
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
