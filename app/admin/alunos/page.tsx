"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { getSafeSession } from "@/lib/authErrorHandler";
import { useAuth } from "@/app/components/AuthProvider";
import {
  MagnifyingGlass,
  Plus,
  WarningCircle,
  SlidersHorizontal,
  ArrowCounterClockwise,
  Clock,
  X,
  EnvelopeSimple,
} from "@phosphor-icons/react";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { StudentsEmptyState } from "@/app/components/admin/students/StudentsEmptyState";
import { MobileListRow } from "@/app/components/MobileListRow";
import { StudentAvatar } from "@/app/components/profile/StudentAvatar";
import { NovoAlunoModal } from "@/app/components/admin/alunos/NovoAlunoModal";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { cn } from "@/lib/utils/cn";
import { textIncludes } from "@/lib/utils/textNormalize";
import { withReturnUrl } from "@/lib/utils/adminNav";
import { Select } from "@/components/ui/Select";
import { getOuCriarConversa } from "@/lib/chat/queries";
import {
  fetchCoachCustomPlans,
  mergedPlans,
  planDisplayName,
  type CoachPlan,
} from "@/lib/coachPlans";

interface ProfileRow {
  id: string;
  coaching_reference?: string | null;
  full_name?: string | null;
  email?: string | null;
  status_pagamento?: string | null;
  tipo_plano?: string | null;
  ultimo_checkin?: string | null;
  avatar_url?: string | null;
  data_expiracao?: string | null;
  data_inicio?: string | null;
  arquivado?: boolean | null;
  sexo?: string | null;
}

function diasRestantes(dataExpiracao: string | null | undefined): number | null {
  if (!dataExpiracao) return null;
  const diff = new Date(dataExpiracao).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function nivelAlerta(dias: number | null, duracaoMeses: number): 'vencido' | 'mes' | 'semana' | null {
  if (dias === null) return null;
  if (dias < 0) return 'vencido';
  const planoLongo = duracaoMeses >= 3;
  if (planoLongo && dias <= 30) return 'mes';
  if (dias <= 7) return 'semana';
  return null;
}

function timeAgo(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return "ontem";
  if (days < 30) return `${days} dias atrás`;
  return `${Math.floor(days / 30)} meses atrás`;
}

/** Ex.: 28/set — dia + mês abreviado (pt-BR) */
function formatVencimentoCurto(dataExpiracao: string | Date): string {
  const d =
    typeof dataExpiracao === "string" && /^\d{4}-\d{2}-\d{2}/.test(dataExpiracao)
      ? new Date(`${dataExpiracao.slice(0, 10)}T12:00:00`)
      : new Date(dataExpiracao);
  const dia = d.getDate();
  const mes = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").trim();
  return `${dia}/${mes}`;
}

export default function AdminAlunosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useBreakpoint("mobile");
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'pendentes' | 'inativos'>('todos');
  const [planoFilter, setPlanoFilter] = useState<string>('todos');
  const [planosPersonalizados, setPlanosPersonalizados] = useState<CoachPlan[]>([]);
  const [sortOption, setSortOption] = useState<'recentes' | 'atividade' | 'vencimento' | 'nome'>('atividade');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cadastroOpen, setCadastroOpen] = useState(false);
  const [openingChatId, setOpeningChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!filtersOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };
    const handlePointer = (event: MouseEvent) => {
      const t = event.target as HTMLElement | null;
      if (t?.closest("[data-alunos-filtros-desktop]")) return;
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handlePointer);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handlePointer);
    };
  }, [filtersOpen]);

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const session = await getSafeSession();
      const coachId = session?.user?.id;
      if (!coachId) { setError("Sessão inválida"); return; }

      // Planos personalizados do coach (para filtro e exibição) — não bloqueia a lista
      fetchCoachCustomPlans(coachId)
        .then(setPlanosPersonalizados)
        .catch(() => setPlanosPersonalizados([]));

      // Vínculo + perfil numa única query (embed) — antes eram 2 round-trips em série
      const { data, error: err } = await supabaseClient
        .from("coach_alunos")
        .select("aluno:profiles!aluno_id(id, full_name, coaching_reference, email, status_pagamento, tipo_plano, ultimo_checkin, avatar_url, data_expiracao, data_inicio, arquivado, sexo)")
        .eq("coach_id", coachId)
        .limit(200);

      if (err) throw err;

      const list = ((data ?? []) as unknown as Array<{ aluno: ProfileRow | null }>)
        .map((r) => r.aluno)
        .filter((p): p is ProfileRow => Boolean(p));

      // Mesma ordenação da query antiga: arquivado asc (nulls first), ultimo_checkin desc (nulls last)
      const rankArquivado = (v: boolean | null | undefined) => (v == null ? 0 : v ? 2 : 1);
      list.sort((a, b) => {
        const d = rankArquivado(a.arquivado) - rankArquivado(b.arquivado);
        if (d !== 0) return d;
        const ta = a.ultimo_checkin ? new Date(a.ultimo_checkin).getTime() : -Infinity;
        const tb = b.ultimo_checkin ? new Date(b.ultimo_checkin).getTime() : -Infinity;
        return tb - ta;
      });

      setRows(list);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    fetchData();
  }, [authLoading, user?.id, fetchData]);

  const handleResetFilters = () => {
    setQuery("");
    setStatusFilter("todos");
    setPlanoFilter("todos");
    setSortOption("atividade");
  };

  const openCadastro = () => {
    if (isMobile) {
      router.push(withReturnUrl("/admin/alunos/novo", "/admin/alunos"));
      return;
    }
    setCadastroOpen(true);
  };

  const openChat = async (alunoId: string) => {
    if (openingChatId) return;
    setOpeningChatId(alunoId);
    try {
      const session = await getSafeSession();
      if (!session?.user?.id) return;
      const conversaId = await getOuCriarConversa(alunoId, session.user.id);
      router.push(`/admin/chat/${conversaId}`);
    } catch {
      router.push("/admin/chat");
    } finally {
      setOpeningChatId(null);
    }
  };

  const activeFilterCount =
    (planoFilter !== 'todos' ? 1 : 0) + (sortOption !== 'atividade' ? 1 : 0);

  // Metrics Calculations based on ALL retrieved rows
  const inativosCount = rows.filter(r => r.arquivado).length;
  const ativosCount = rows.filter(r => {
    if (r.arquivado) return false;
    const isPaid = r.status_pagamento === "pago";
    const expiration = r.data_expiracao ? new Date(r.data_expiracao) : null;
    return isPaid && (!expiration || expiration >= new Date());
  }).length;
  const pendentesCount = rows.filter(r => {
    if (r.arquivado) return false;
    const isPaid = r.status_pagamento === "pago";
    const expiration = r.data_expiracao ? new Date(r.data_expiracao) : null;
    const isExpired = expiration && expiration < new Date();
    return !isPaid || isExpired;
  }).length;

  const alertasVencendoEmBreve = rows.filter(r => {
    if (r.arquivado) return false;
    const dias = diasRestantes(r.data_expiracao);
    return dias !== null && dias >= 0 && dias <= 7;
  }).length;

  // In-memory Filter and Sort processing
  const processedRows = rows.filter((r) => {
    // 1. Query search (name or email)
    const name = r.coaching_reference || r.full_name || r.email || "";
    const email = r.email || "";
    const matchesSearch =
      textIncludes(name, query) ||
      textIncludes(email, query);
    if (!matchesSearch) return false;

    // 2. Status Filter
    const isPaid = r.status_pagamento === "pago";
    const expiration = r.data_expiracao ? new Date(r.data_expiracao) : null;
    const isExpired = expiration && expiration < new Date();
    const isActive = isPaid && (!expiration || expiration >= new Date());
    const isArquivado = !!r.arquivado;

    if (statusFilter === 'ativos') {
      return isActive && !isArquivado;
    } else if (statusFilter === 'pendentes') {
      return !isActive && !isArquivado;
    } else if (statusFilter === 'inativos') {
      return isArquivado;
    }

    return true; // 'todos'
  }).filter((r) => {
    // 3. Plan Filter
    if (planoFilter === 'todos') return true;
    return r.tipo_plano === planoFilter;
  }).sort((a, b) => {
    // 4. Sorting logic
    if (sortOption === 'nome') {
      const nameA = a.coaching_reference || a.full_name || a.email || "";
      const nameB = b.coaching_reference || b.full_name || b.email || "";
      return nameA.localeCompare(nameB);
    } else if (sortOption === 'vencimento') {
      if (!a.data_expiracao) return 1;
      if (!b.data_expiracao) return -1;
      return new Date(a.data_expiracao).getTime() - new Date(b.data_expiracao).getTime();
    } else if (sortOption === 'atividade') {
      if (!a.ultimo_checkin) return 1;
      if (!b.ultimo_checkin) return -1;
      return new Date(b.ultimo_checkin).getTime() - new Date(a.ultimo_checkin).getTime();
    } else { // 'recentes'
      const dateA = a.data_inicio ? new Date(a.data_inicio).getTime() : 0;
      const dateB = b.data_inicio ? new Date(b.data_inicio).getTime() : 0;
      return dateB - dateA;
    }
  });

  return (
    <div className="min-h-screen bg-surface-0 p-4 pb-24 text-text-primary font-sans md:p-8 lg:min-h-0 lg:bg-transparent lg:p-0 lg:pb-0">
      <div className="w-full max-w-[min(1600px,96vw)] mx-auto flex flex-col gap-8 lg:max-w-none lg:gap-4">

        {/* Mobile: botão no topo. Desktop: CTA na barra Nutrium abaixo */}
        <div className="flex items-center justify-end gap-4 lg:hidden">
          <button
            onClick={openCadastro}
            className="auron-cta-btn inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all active:scale-95"
          >
            <Plus size={13} weight="bold" /> Adicionar Aluno
          </button>
        </div>

        <div className="relative z-20 hidden items-center justify-between px-6 py-4 lg:flex">
          <button
            type="button"
            onClick={openCadastro}
            className="auron-cta-btn inline-flex h-[42px] items-center gap-1.5 rounded-lg px-4 text-sm font-medium"
          >
            Cadastrar aluno
            <Plus size={16} weight="bold" />
          </button>
          <div className="flex items-center justify-end gap-2">
            <Select
              size="sm"
              className="w-[215px]"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as typeof statusFilter)}
              options={[
                { value: "todos", label: "Todos os alunos" },
                { value: "ativos", label: "Alunos ativos" },
                { value: "pendentes", label: "Alunos pendentes" },
                { value: "inativos", label: "Alunos inativos" },
              ]}
            />
            <div className="relative" data-alunos-filtros-desktop>
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
                className="relative flex h-[42px] w-[42px] items-center justify-center rounded-lg border border-[#E4E7ED] bg-white text-[#5E6982] hover:text-brand"
                aria-label="Filtros"
              >
                <SlidersHorizontal size={16} />
                {activeFilterCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-text-on-brand tabular-nums">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {filtersOpen && (
                <div className="absolute right-0 z-50 mt-1.5 w-56 rounded-xl bg-surface-2 p-3 shadow-[0_8px_28px_rgba(0,0,0,0.28)]">
                  <div className="mb-3">
                    <Select
                      label="Plano"
                      size="sm"
                      value={planoFilter}
                      onChange={setPlanoFilter}
                      options={[
                        { value: "todos", label: "Todos os planos" },
                        ...mergedPlans(planosPersonalizados).map((p) => ({
                          value: p.slug,
                          label: p.nome,
                        })),
                      ]}
                    />
                  </div>
                  <Select
                    label="Ordenar por"
                    size="sm"
                    value={sortOption}
                    onChange={(v) => setSortOption(v as typeof sortOption)}
                    options={[
                      { value: "atividade", label: "Última atividade" },
                      { value: "recentes", label: "Mais recentes" },
                      { value: "vencimento", label: "Vencimento" },
                      { value: "nome", label: "Nome" },
                    ]}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="hidden px-6 pb-4 lg:block">
          <div className="relative">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busque alunos por nome, ID ou contato..."
              aria-label="Buscar alunos"
              style={{ touchAction: "manipulation" }}
              className="h-[37px] w-full rounded-lg border border-[#E4E7ED] bg-white px-2 pr-10 text-sm text-[#343A46] outline-none placeholder:text-[#5E6982] focus:border-brand focus:ring-1 focus:ring-brand/20"
            />
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[#5E6982]"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <DumbbellLoader text="Sincronizando base de alunos..." variant="inline" />
          </div>
        ) : rows.length === 0 ? (
          <div className="overflow-hidden rounded-xl bg-surface-1 shadow-sm">
            <StudentsEmptyState
              variant="no-students"
              onAddStudent={openCadastro}
            />
          </div>
        ) : (
          /* Main Layout with Data */
          <div className="flex flex-col gap-5">

            {/* KPIs só no celular */}
            <div className="grid grid-cols-2 gap-3 lg:hidden">
              {[
                { label: "Ativos", value: ativosCount, dotColor: "bg-success" },
                { label: "Pendentes", value: pendentesCount, dotColor: "bg-warning" },
                { label: "Vencendo em breve", value: alertasVencendoEmBreve, dotColor: "bg-danger" },
                { label: "Inativos", value: inativosCount, dotColor: "bg-text-disabled" },
              ].map(({ label, value, dotColor }) => (
                <div
                  key={label}
                  className="alunos-kpi-card relative overflow-hidden rounded-xl p-4 border border-border-subtle bg-surface-1 flex flex-col justify-center h-20"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.03)_42%,transparent_68%)]"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/20"
                  />
                  <div className="relative z-10 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 leading-none">
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />
                      <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{label}</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-text-primary mt-1.5 font-mono tabular-nums lining-nums leading-none">{value}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="alunos-list-panel flex flex-col gap-5">

            <div className="field-flat-input overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 lg:hidden">
              <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
                <div className="relative w-full pl-6">
                  <MagnifyingGlass
                    size={14}
                    className="pointer-events-none absolute left-0 top-1/2 z-10 -translate-y-1/2 text-text-disabled"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Localizar por nome ou e-mail..."
                    aria-label="Buscar alunos"
                    style={{ touchAction: "manipulation" }}
                    className="w-full border-0 bg-transparent text-sm text-text-primary shadow-none outline-none placeholder:text-text-disabled"
                  />
                </div>

                <div className="flex w-full flex-col items-stretch gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="grid h-9 grid-cols-4 gap-1 rounded-lg p-1 sm:flex sm:items-center">
                    {(["todos", "ativos", "pendentes", "inativos"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        style={{ touchAction: "manipulation" }}
                        aria-pressed={statusFilter === status}
                        className={cn(
                          "flex h-7 w-full cursor-pointer items-center justify-center rounded-md border-0 bg-transparent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-all sm:w-auto",
                          statusFilter === status
                            ? "font-bold text-brand"
                            : "text-text-tertiary hover:text-text-primary",
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(true)}
                      style={{ touchAction: "manipulation" }}
                      aria-haspopup="dialog"
                      className="relative flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border-subtle bg-transparent px-3 text-[12px] font-semibold text-text-secondary transition-colors hover:bg-brand/5 hover:text-brand"
                    >
                      <SlidersHorizontal size={14} />
                      Filtros
                      {activeFilterCount > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-text-on-brand tabular-nums">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={handleResetFilters}
                      style={{ touchAction: "manipulation" }}
                      aria-label="Limpar filtros"
                      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border-subtle bg-transparent text-text-secondary transition-colors hover:bg-brand/5 hover:text-brand"
                      title="Limpar filtros"
                    >
                      <ArrowCounterClockwise size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>


            {/* ── Table / Grid of Athletes ── */}
            {processedRows.length === 0 ? (
              /* No results from search / filter */
              <div className="bg-surface-1 border-0 rounded-xl p-12 text-center max-w-md mx-auto shadow-sm">
                <WarningCircle size={36} className="text-warning/60 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-text-primary mb-1">Nenhum aluno encontrado</h3>
                <p className="text-text-secondary text-xs mb-5">
                  Tente buscar por outro termo, e-mail ou remova os filtros aplicados.
                </p>
                <div className="flex justify-center gap-3">
                  <button onClick={handleResetFilters} className="btn-secondary text-[11px] py-1.5 px-3 rounded-lg">
                    Limpar filtros
                  </button>
                  <button
                    onClick={openCadastro}
                    className="btn-primary text-[11px] py-1.5 px-3 rounded-lg"
                  >
                    Adicionar novo aluno
                  </button>
                </div>
              </div>
            ) : isMobile ? (
              <div className="bg-surface-1 border border-border-subtle rounded-2xl p-3 divide-y divide-border-divider">
                {processedRows.map((row) => {
                  const name = row.coaching_reference || row.full_name || row.email || "Sem Nome";
                  const isAtivo = row.status_pagamento === "pago";
                  const isArquivado = !!row.arquivado;
                  const expiration = row.data_expiracao ? new Date(row.data_expiracao) : null;
                  const isExpired = expiration && expiration < new Date();
                  const isActive = isAtivo && (!expiration || expiration >= new Date());
                  const dias = diasRestantes(row.data_expiracao);
                  const duracaoMeses =
                    mergedPlans(planosPersonalizados).find((p) => p.slug === row.tipo_plano)
                      ?.duracao_meses ?? 1;
                  const alerta = isArquivado ? null : nivelAlerta(dias, duracaoMeses);

                  return (
                    <MobileListRow
                      key={row.id}
                      name={name}
                      leading={
                        <StudentAvatar
                          name={name}
                          avatarUrl={row.avatar_url}
                          sexo={row.sexo}
                          className={isArquivado ? "grayscale" : undefined}
                        />
                      }
                      badge={
                        <span className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border",
                          isArquivado
                            ? "bg-surface-3 text-text-disabled border-transparent"
                            : isActive
                              ? "bg-success-subtle text-success border-success/15"
                              : "bg-danger-subtle text-danger border-danger/15"
                        )}>
                          {isArquivado ? "Inativo" : isActive ? "Ativo" : isExpired ? "Expirado" : "Pendente"}
                        </span>
                      }
                      topRight={
                        <button
                          type="button"
                          onClick={() => router.push(withReturnUrl(`/admin/aluno/${row.id}`, "/admin/alunos"))}
                          className="text-brand text-xs font-medium hover:underline"
                        >
                          Ver perfil →
                        </button>
                      }
                      meta={
                        <>
                          <span className="capitalize shrink-0">{planDisplayName(row.tipo_plano, planosPersonalizados)}</span>
                          <span className="text-brand/50 shrink-0 mx-0.5" aria-hidden>•</span>
                          <span className="truncate min-w-0">
                            {row.ultimo_checkin ? timeAgo(row.ultimo_checkin) : "Sem registros"}
                          </span>
                          {expiration && (
                            <>
                              <span className="text-brand/50 shrink-0 mx-0.5" aria-hidden>•</span>
                              <span
                                className={cn(
                                  "shrink-0 whitespace-nowrap font-medium",
                                  alerta === "vencido" && "text-danger",
                                  alerta === "semana" && "text-warning",
                                  alerta === "mes" && "text-amber-500",
                                  !alerta && "text-text-tertiary",
                                )}
                              >
                                {alerta === "vencido"
                                  ? `vencido${dias != null ? ` há ${Math.abs(dias)}d` : ""}`
                                  : alerta === "semana" && dias != null
                                    ? dias === 0
                                      ? "vence hoje"
                                      : `vence em ${dias}d`
                                    : `vence ${expiration.toLocaleDateString("pt-BR")}`}
                              </span>
                            </>
                          )}
                        </>
                      }
                    />
                  );
                })}
                {rows.length < 5 && (
                  <StudentsEmptyState variant="grow" />
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="hidden items-center gap-3 px-6 sm:flex">
                  <div className="min-w-0 flex-[1.4] text-left text-sm font-normal text-[#5E6982]">
                    Alunos ({processedRows.length})
                  </div>
                  <div className="grid min-w-0 flex-[3] grid-cols-5 gap-2">
                    <div className="text-sm font-normal text-[#5E6982]">Plano</div>
                    <div className="text-sm font-normal text-[#5E6982]">Contato</div>
                    <div className="text-sm font-normal text-[#5E6982]">Vencimento</div>
                    <div className="text-sm font-normal text-[#5E6982]">Última atividade</div>
                    <div className="text-sm font-normal text-[#5E6982]">Status</div>
                  </div>
                  <div className="w-11 shrink-0" />
                </div>
                <div className="flex flex-col gap-2">
                  {processedRows.map((row) => {
                    const name = row.coaching_reference || row.full_name || row.email || "Sem Nome";
                    const isAtivo = row.status_pagamento === "pago";
                    const isArquivado = !!row.arquivado;
                    const expiration = row.data_expiracao ? new Date(row.data_expiracao) : null;
                    const isExpired = expiration && expiration < new Date();
                    const isActive = isAtivo && (!expiration || expiration >= new Date());
                    const dias = diasRestantes(row.data_expiracao);
                    const duracaoMeses =
                      mergedPlans(planosPersonalizados).find((p) => p.slug === row.tipo_plano)?.duracao_meses ?? 1;
                    const alerta = isArquivado ? null : nivelAlerta(dias, duracaoMeses);
                    const statusLabel = isArquivado
                      ? "Inativo"
                      : isActive
                        ? "Ativo"
                        : isExpired
                          ? "Expirado"
                          : "Pendente";

                    return (
                      <div
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(withReturnUrl(`/admin/aluno/${row.id}`, "/admin/alunos"))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            router.push(withReturnUrl(`/admin/aluno/${row.id}`, "/admin/alunos"));
                          }
                        }}
                        className={cn(
                          "alunos-result-row relative flex cursor-pointer items-center gap-3 border-b border-[#E4E7ED] bg-transparent px-6 py-3 transition-colors hover:bg-black/[0.02] last:border-b-0",
                          isArquivado && "opacity-60",
                          alerta === "vencido" && "bg-danger/5",
                        )}
                      >
                        <div className="flex min-w-0 flex-[1.4] items-center gap-3">
                          <StudentAvatar
                            name={name}
                            avatarUrl={row.avatar_url}
                            sexo={row.sexo}
                            className={isArquivado ? "grayscale" : undefined}
                          />
                          <span className="truncate text-sm font-medium text-brand" title={name}>
                            {name}
                          </span>
                        </div>
                        <div className="hidden min-w-0 flex-[3] grid-cols-5 items-center gap-2 sm:grid">
                          <div className="truncate text-[13px] text-text-secondary capitalize">
                            {planDisplayName(row.tipo_plano, planosPersonalizados)}
                          </div>
                          <div className="truncate text-[13px] text-text-secondary" title={row.email || undefined}>
                            {row.email || "—"}
                          </div>
                          <div className="text-[13px]">
                            {expiration ? (
                              <span
                                className={cn(
                                  "font-medium",
                                  alerta === "vencido" && "text-danger",
                                  alerta === "semana" && "text-warning",
                                  alerta === "mes" && "text-amber-500",
                                  !alerta && "text-text-secondary",
                                )}
                              >
                                {formatVencimentoCurto(row.data_expiracao!)}
                              </span>
                            ) : (
                              <span className="text-text-tertiary">—</span>
                            )}
                          </div>
                          <div className="truncate text-[13px] text-text-secondary">
                            {row.ultimo_checkin ? (
                              <span className="inline-flex items-center gap-1">
                                {timeAgo(row.ultimo_checkin)}
                                <Clock size={11} className="shrink-0 text-text-tertiary" />
                              </span>
                            ) : (
                              "—"
                            )}
                          </div>
                          <div>
                            <span
                              className={cn(
                                "inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold",
                                isArquivado
                                  ? "bg-surface-3 text-text-disabled"
                                  : isActive
                                    ? "bg-success-subtle text-success"
                                    : "bg-danger-subtle text-danger",
                              )}
                            >
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label="Enviar mensagem"
                          disabled={openingChatId === row.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void openChat(row.id);
                          }}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent text-text-tertiary hover:text-brand"
                        >
                          <EnvelopeSimple size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                {rows.length < 5 && (
                  <div className="px-1">
                    <StudentsEmptyState variant="grow" />
                  </div>
                )}
              </div>
            )}

            </div>

          </div>
        )}

      </div>

      {/* ── Modal de Filtros (mobile) ── */}
      {isMobile && filtersOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] animate-backdrop-in"
            onClick={() => setFiltersOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="filtros-modal-title"
            className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] animate-sheet-up sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2"
          >
            <div
              className="mx-auto w-full max-w-sm rounded-2xl bg-surface-1 border border-border-subtle shadow-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border-divider">
                <p id="filtros-modal-title" className="text-sm font-bold text-text-primary">
                  Filtros
                </p>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  aria-label="Fechar filtros"
                  style={{ touchAction: "manipulation" }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:text-text-primary hover:bg-brand/5 active:scale-95 border-0 bg-transparent cursor-pointer"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              <div className="field-flat-input flex flex-col">
                <div className="px-5 py-3.5 border-b border-border-divider">
                  <label
                    htmlFor="filtro-plano"
                    className="block text-[11px] text-text-tertiary mb-1"
                  >
                    Plano
                  </label>
                  <select
                    id="filtro-plano"
                    value={planoFilter}
                    onChange={(e) => setPlanoFilter(e.target.value as any)}
                    className="w-full bg-transparent border-0 outline-none text-sm text-text-primary appearance-none cursor-pointer p-0"
                    style={{ touchAction: "manipulation" }}
                  >
                    <option value="todos">Todos os planos</option>
                    {mergedPlans(planosPersonalizados).map((p) => (
                      <option key={p.slug} value={p.slug}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="px-5 py-3.5">
                  <label
                    htmlFor="filtro-ordenacao"
                    className="block text-[11px] text-text-tertiary mb-1"
                  >
                    Ordenar por
                  </label>
                  <select
                    id="filtro-ordenacao"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as any)}
                    className="w-full bg-transparent border-0 outline-none text-sm text-text-primary appearance-none cursor-pointer p-0"
                    style={{ touchAction: "manipulation" }}
                  >
                    <option value="atividade">Última atividade</option>
                    <option value="recentes">Mais recentes</option>
                    <option value="vencimento">Vencimento</option>
                    <option value="nome">Nome</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 px-4 pb-4">
                <button
                  type="button"
                  onClick={() => {
                    setPlanoFilter('todos');
                    setSortOption('atividade');
                  }}
                  style={{ touchAction: 'manipulation' }}
                  className="flex-1 h-11 rounded-[10px] bg-surface-2 text-[13px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  style={{ touchAction: 'manipulation' }}
                  className="flex-1 h-11 rounded-[10px] btn-primary !p-0 text-[13px] font-semibold"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <NovoAlunoModal
        open={cadastroOpen}
        onClose={() => setCadastroOpen(false)}
        onCreated={() => {
          void fetchData({ silent: true });
        }}
      />
    </div>
  );
}
