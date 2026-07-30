"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { getSafeSession } from "@/lib/authErrorHandler";
import { useAuth } from "@/app/components/AuthProvider";
import {
  MagnifyingGlass,
  Plus,
  TrendUp,
  WarningCircle,
  CaretRight,
  Bell,
  SlidersHorizontal,
  ArrowCounterClockwise,
  Clock,
  Warning,
  X
} from "@phosphor-icons/react";
import { getPublicStorageUrl } from "@/lib/storageUrls";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { StudentsEmptyState } from "@/app/components/admin/students/StudentsEmptyState";
import { MobileListRow } from "@/app/components/MobileListRow";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { cn } from "@/lib/utils/cn";
import { textIncludes } from "@/lib/utils/textNormalize";
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

const AVATAR_COLORS = [
  "from-amber-500/50 to-amber-700/30",
  "from-orange-500/50 to-orange-700/30",
  "from-yellow-500/50 to-yellow-700/30",
  "from-brand/50 to-brand/20",
];

function avatarGrad(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
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

  useEffect(() => {
    if (!filtersOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [filtersOpen]);

  const fetchData = useCallback(async () => {
    setLoading(true);
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
        .select("aluno:profiles!aluno_id(id, full_name, coaching_reference, email, status_pagamento, tipo_plano, ultimo_checkin, avatar_url, data_expiracao, data_inicio, arquivado)")
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
    <div className="min-h-screen bg-surface-0 p-4 md:p-8 lg:p-10 lg:pl-28 pb-24 text-text-primary font-sans">
      <div className="w-full max-w-[min(1600px,96vw)] mx-auto flex flex-col gap-8">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-end gap-4">
          <button
            onClick={() => router.push("/admin/alunos/novo")}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hover text-text-on-brand text-xs font-semibold rounded-lg transition-all active:scale-95 shadow-md shadow-brand/10 w-fit"
          >
            <Plus size={13} weight="bold" /> Adicionar Aluno
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <DumbbellLoader text="Sincronizando base de alunos..." variant="inline" />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-surface-1 border-0 rounded-xl overflow-hidden shadow-sm">
            <StudentsEmptyState
              variant="no-students"
              onAddStudent={() => router.push("/admin/alunos/novo")}
            />
          </div>
        ) : (
          /* Main Layout with Data */
          <div className="flex flex-col gap-5">

            {/* ── Stats Bar / Metrics Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Ativos", value: ativosCount, dotColor: "bg-success" },
                { label: "Pendentes", value: pendentesCount, dotColor: "bg-warning" },
                { label: "Vencendo em breve", value: alertasVencendoEmBreve, dotColor: "bg-danger" },
                { label: "Inativos", value: inativosCount, dotColor: "bg-text-disabled" },
              ].map(({ label, value, dotColor }) => (
                <div key={label} className={cn(
                  "bg-surface-1 rounded-lg p-4 border-0 flex flex-col justify-center h-20",
                  label === "Inativos" ? "shadow-md" : "shadow-sm"
                )}>
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{label}</span>
                  </div>
                  <span className="text-xl font-bold tracking-tight text-text-primary mt-1.5 font-mono tabular-nums lining-nums leading-none">{value}</span>
                </div>
              ))}
            </div>

            {/* ── Filters and Search Line ── */}
            <div className="bg-surface-1 border-0 rounded-lg p-2.5 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-sm">
              <div className="relative w-full lg:max-w-[280px]">
                <MagnifyingGlass
                  size={12}
                  className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--filter-placeholder)]"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Localizar por nome ou e-mail..."
                  aria-label="Buscar alunos"
                  style={{ touchAction: "manipulation" }}
                  className="filter-control filter-control-search filter-control-compact w-full shadow-sm"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto lg:justify-end">
                {/* Status Filter — segmented control (largura igual no mobile) */}
                <div className="grid grid-cols-4 sm:flex sm:items-center gap-1 bg-[var(--tab-track-bg)] border-0 rounded-md p-1 h-8.5">
                  {(['todos', 'ativos', 'pendentes', 'inativos'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      style={{ touchAction: 'manipulation' }}
                      aria-pressed={statusFilter === status}
                      className={cn(
                        "w-full sm:w-auto px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-[8px] transition-all h-6.5 flex items-center justify-center",
                        statusFilter === status
                          ? "bg-[var(--tab-active-bg)] border-0 text-[var(--tab-active-text)] shadow-sm"
                          : "bg-transparent text-[var(--tab-inactive-text)] hover:text-text-primary"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {/* Botão Filtros (abre modal) + reset — mesma linha e altura */}
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(true)}
                    style={{ touchAction: 'manipulation' }}
                    aria-haspopup="dialog"
                    className="relative flex h-8.5 items-center gap-1.5 rounded-md border-0 bg-[var(--filter-bg)] hover:bg-[var(--filter-bg-focus)] px-3 text-[12px] font-semibold text-[var(--filter-text)] transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal size={14} />
                    Filtros
                    {activeFilterCount > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-text-on-brand tabular-nums">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {/* Reset filters */}
                  <button
                    onClick={handleResetFilters}
                    style={{ touchAction: 'manipulation' }}
                    aria-label="Limpar filtros"
                    className="w-8.5 h-8.5 shrink-0 flex items-center justify-center bg-[var(--filter-bg)] hover:bg-[var(--filter-bg-focus)] border-0 text-text-secondary hover:text-text-primary rounded-md transition-colors"
                    title="Limpar filtros"
                  >
                    <ArrowCounterClockwise size={13} />
                  </button>
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
                  <button onClick={() => router.push("/admin/alunos/novo")} className="btn-primary text-[11px] py-1.5 px-3 rounded-lg">
                    Adicionar novo aluno
                  </button>
                </div>
              </div>
            ) : isMobile ? (
              <div className="bg-surface-1 border-0 rounded-xl p-3 shadow-sm divide-y divide-[color:var(--list-row-divider)]">
                {processedRows.map((row) => {
                  const name = row.coaching_reference || row.full_name || row.email || "Sem Nome";
                  const isAtivo = row.status_pagamento === "pago";
                  const isArquivado = !!row.arquivado;
                  const expiration = row.data_expiracao ? new Date(row.data_expiracao) : null;
                  const isExpired = expiration && expiration < new Date();
                  const isActive = isAtivo && (!expiration || expiration >= new Date());

                  return (
                    <MobileListRow
                      key={row.id}
                      name={name}
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
                          onClick={() => router.push(`/admin/aluno/${row.id}`)}
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
                              <span className="shrink-0 whitespace-nowrap">
                                vence {expiration.toLocaleDateString("pt-BR")}
                              </span>
                            </>
                          )}
                        </>
                      }
                    />
                  );
                })}
                {rows.length < 5 && (
                  <StudentsEmptyState
                    variant="grow"
                    onAddStudent={() => router.push("/admin/alunos/novo")}
                  />
                )}
              </div>
            ) : (
              <div className="bg-surface-1 border-0 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-divider bg-surface-2/40">
                        <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Aluno</th>
                        <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Status</th>
                        <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Plano</th>
                        <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Vencimento</th>
                        <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase">Última Atividade</th>
                        <th className="p-3 text-[10px] font-bold tracking-wider text-text-tertiary uppercase text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
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

                        return (
                          <tr
                            key={row.id}
                            onClick={() => router.push(`/admin/aluno/${row.id}`)}
                            className={cn(
                              "border-b border-divider/50 last:border-b-0 cursor-pointer transition-colors hover:bg-surface-2/40",
                              isArquivado && "opacity-60",
                              alerta === 'vencido' && "bg-danger/5 hover:bg-danger/10"
                            )}
                          >
                            {/* Avatar & Name */}
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-[10px] text-white overflow-hidden shrink-0",
                                  isArquivado ? "grayscale" : avatarGrad(name)
                                )}>
                                  {row.avatar_url ? (
                                    <img src={getPublicStorageUrl('avatars', row.avatar_url) || ""} alt={name} className="w-full h-full object-cover" />
                                  ) : (
                                    name[0].toUpperCase()
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold text-text-primary leading-tight truncate">
                                    {name}
                                  </span>
                                  <span className="text-[10px] text-text-tertiary leading-none mt-0.5 truncate">
                                    {row.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Status Badge */}
                            <td className="p-3">
                              <span className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                                isArquivado
                                  ? "bg-surface-3 text-text-disabled border-transparent"
                                  : isActive
                                    ? "bg-success-subtle text-success border-success/15"
                                    : "bg-danger-subtle text-danger border-danger/15"
                              )}>
                                <span className={cn(
                                  "w-1.25 h-1.25 rounded-full",
                                  isArquivado ? "bg-text-disabled" : isActive ? "bg-success" : "bg-danger"
                                )} />
                                {isArquivado ? "Inativo" : isActive ? "Ativo" : isExpired ? "Expirado" : "Pendente"}
                              </span>
                            </td>

                            {/* Plan Type */}
                            <td className="p-3 text-xs text-text-secondary capitalize font-medium">
                              {planDisplayName(row.tipo_plano, planosPersonalizados)}
                            </td>

                            {/* Expiration date with alerts */}
                            <td className="p-3 text-xs">
                              {expiration ? (
                                <div className="flex items-center gap-1.5">
                                  {alerta === 'semana' && <Warning size={12} className="text-warning shrink-0" />}
                                  <div className="flex flex-col">
                                    <span className={cn(
                                      "font-medium",
                                      alerta === 'vencido' && "text-danger font-semibold",
                                      alerta === 'semana' && "text-warning font-semibold",
                                      alerta === 'mes' && "text-amber-500 font-semibold",
                                      !alerta && "text-text-secondary"
                                    )}>
                                      {expiration.toLocaleDateString('pt-BR')}
                                    </span>
                                    {alerta === 'vencido' && dias !== null && (
                                      <span className="text-[9px] text-danger/80 leading-none mt-0.5">Vencido há {Math.abs(dias)}d</span>
                                    )}
                                    {alerta === 'semana' && dias !== null && (
                                      <span className="text-[9px] text-warning/80 leading-none mt-0.5">Vence em {dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `${dias}d`}</span>
                                    )}
                                    {alerta === 'mes' && dias !== null && (
                                      <span className="text-[9px] text-amber-500/80 leading-none mt-0.5">{dias}d restantes</span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-text-tertiary">—</span>
                              )}
                            </td>

                            {/* Last Activity checkin */}
                            <td className="p-3 text-xs text-text-secondary font-medium">
                              {row.ultimo_checkin ? (
                                <div className="flex items-center gap-1">
                                  <Clock size={11} className="text-text-tertiary" />
                                  <span>{timeAgo(row.ultimo_checkin)}</span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-2 border-0 text-text-tertiary text-[9px] font-semibold uppercase tracking-wider">
                                  Sem registros
                                </span>
                              )}
                            </td>

                            {/* Link action */}
                            <td className="p-3 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/admin/aluno/${row.id}`);
                                }}
                                className="text-[13px] font-medium text-brand hover:underline"
                              >
                                Ver perfil →
                              </button>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {rows.length < 5 && (
                  <div className="px-3 pb-3 border-t border-[color:var(--list-row-divider)]">
                    <StudentsEmptyState
                      variant="grow"
                      onAddStudent={() => router.push("/admin/alunos/novo")}
                    />
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>

      {/* ── Modal de Filtros ── */}
      {filtersOpen && (
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
              className="mx-auto w-full max-w-sm rounded-xl bg-surface-1 shadow-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-divider">
                <p id="filtros-modal-title" className="text-sm font-bold text-text-primary">
                  Filtros
                </p>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  aria-label="Fechar filtros"
                  style={{ touchAction: 'manipulation' }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:text-text-primary hover:bg-surface-2 active:scale-95"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              <div className="flex flex-col gap-4 px-4 py-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="filtro-plano"
                    className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary"
                  >
                    Plano
                  </label>
                  <select
                    id="filtro-plano"
                    value={planoFilter}
                    onChange={(e) => setPlanoFilter(e.target.value as any)}
                    className="filter-control w-full h-11 rounded-[10px] font-medium focus:outline-none appearance-none transition-all duration-150 cursor-pointer"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <option value="todos">Todos os planos</option>
                    {mergedPlans(planosPersonalizados).map((p) => (
                      <option key={p.slug} value={p.slug}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="filtro-ordenacao"
                    className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary"
                  >
                    Ordenar por
                  </label>
                  <select
                    id="filtro-ordenacao"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as any)}
                    className="filter-control w-full h-11 rounded-[10px] font-medium focus:outline-none appearance-none transition-all duration-150 cursor-pointer"
                    style={{ touchAction: 'manipulation' }}
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
    </div>
  );
}
