"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CaretLeft, CaretRight, Clock, Briefcase, MapPin, VideoCamera, Trash } from "@phosphor-icons/react";
import { supabaseClient } from "@/lib/supabaseClient";
import { getSafeSession } from "@/lib/authErrorHandler";
import { StudentAvatar } from "@/app/components/profile/StudentAvatar";
import { Button } from "@/components/ui/Button";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import {
  fetchAgendaRange,
  fetchAulasFuturas,
  cancelarAula,
  type AulaAgenda,
  type ItemTipo,
} from "@/lib/agenda/queries";
import {
  addDays,
  addMonths,
  getMonday,
  getMonthGridDays,
  getWeekDays,
} from "@/lib/agenda/dateHelpers";
import { GridCalendar } from "./components/GridCalendar";
import { MonthCalendar } from "./components/MonthCalendar";
import { YearCalendar } from "./components/YearCalendar";
import { CreateMenu } from "./components/CreateMenu";
import { CreateItemModal } from "./components/CreateItemModal";
import { HorarioTrabalhoModal } from "./components/HorarioTrabalhoModal";

type ViewMode = "dia" | "semana" | "mes" | "ano";

interface AlunoOption {
  id: string;
  nome: string;
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

  const [view, setView] = useState<ViewMode>("semana");
  const [anchor, setAnchor] = useState(new Date());
  const [rangeItems, setRangeItems] = useState<AulaAgenda[]>([]);
  const [proximasAulas, setProximasAulas] = useState<AulaAgenda[]>([]);

  const [createOpen, setCreateOpen] = useState<{ tipo: ItemTipo; date?: string; time?: string } | null>(null);
  const [horarioOpen, setHorarioOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AulaAgenda | null>(null);

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

  const loadRangeItems = useCallback(
    async (uid: string) => {
      const items = await fetchAgendaRange(uid, rangeStart.toISOString(), rangeEnd.toISOString());
      setRangeItems(items);
    },
    [rangeStart, rangeEnd],
  );

  const loadProximasAulas = useCallback(async (uid: string) => {
    setProximasAulas(await fetchAulasFuturas(uid));
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
      await Promise.all([loadAlunos(uid), loadProximasAulas(uid)]);
      setLoading(false);
    })();
  }, [loadAlunos, loadProximasAulas]);

  useEffect(() => {
    if (!coachId) return;
    void loadRangeItems(coachId);
  }, [coachId, loadRangeItems]);

  const refreshAll = useCallback(() => {
    if (!coachId) return;
    void loadRangeItems(coachId);
    void loadProximasAulas(coachId);
  }, [coachId, loadRangeItems, loadProximasAulas]);

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

  const handleCancelarSelecionado = async () => {
    if (!selectedItem) return;
    await cancelarAula(selectedItem.id);
    setSelectedItem(null);
    refreshAll();
  };

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
                className="rounded-lg px-2.5 py-1 text-sm font-medium text-text-secondary hover:bg-surface-2"
              >
                Hoje
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
                  onClick={() => setView(v)}
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
          </div>

          {/* Coluna lateral — mesmo padrão do card do dashboard, um pouco mais estreita */}
          <div className="flex flex-col gap-4">
            <div
              className="rounded-xl border-0 bg-surface-1 p-4"
              style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.14)" }}
            >
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                Próximas aulas agendadas
              </h2>

              {proximasAulas.length === 0 ? (
                <p className="text-xs text-text-disabled">Nenhuma aula agendada.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {proximasAulas.slice(0, 8).map((aula) => {
                    const { dia, hora } = formatDiaHora(aula.data_hora);
                    const nome =
                      aula.aluno?.coaching_reference || aula.aluno?.full_name || "Aluno";
                    return (
                      <button
                        key={aula.id}
                        type="button"
                        onClick={() => setSelectedItem(aula)}
                        className="flex items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-surface-2/60"
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
                    );
                  })}
                </div>
              )}
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
            <p className="mb-1 text-sm font-bold text-text-primary">
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
            <div className="flex items-center gap-3">
              <Button variant="secondary" fullWidth onClick={() => setSelectedItem(null)}>
                Fechar
              </Button>
              <Button
                variant="danger"
                fullWidth
                leftIcon={<Trash size={14} />}
                onClick={() => void handleCancelarSelecionado()}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
