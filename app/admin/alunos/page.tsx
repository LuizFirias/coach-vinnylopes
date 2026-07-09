"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
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
  Warning
} from "@phosphor-icons/react";
import { getPublicStorageUrl } from "@/lib/storageUrls";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { StudentsEmptyState } from "@/app/components/admin/students/StudentsEmptyState";
import { MobileListRow } from "@/app/components/MobileListRow";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { cn } from "@/lib/utils/cn";

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

function nivelAlerta(dias: number | null, tipoPLano: string | null | undefined): 'vencido' | 'mes' | 'semana' | null {
  if (dias === null) return null;
  if (dias < 0) return 'vencido';
  const planoLongo = ['anual', 'semestral', 'trimestral'].includes(tipoPLano ?? '');
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
  const [planoFilter, setPlanoFilter] = useState<'todos' | 'mensal' | 'trimestral' | 'semestral' | 'anual'>('todos');
  const [sortOption, setSortOption] = useState<'recentes' | 'atividade' | 'vencimento' | 'nome'>('atividade');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) { setError("Sessão inválida"); return; }

      const { data: links } = await supabaseClient
        .from("coach_alunos").select("aluno_id").eq("coach_id", coachId);

      const ids = links?.map(l => l.aluno_id) ?? [];
      if (ids.length === 0) { setRows([]); return; }

      const { data, error: err } = await supabaseClient
        .from("profiles")
        .select("id, full_name, coaching_reference, email, status_pagamento, tipo_plano, ultimo_checkin, avatar_url, data_expiracao, data_inicio, arquivado")
        .in("id", ids)
        .order("arquivado", { ascending: true, nullsFirst: true })
        .order("ultimo_checkin", { ascending: false, nullsFirst: false })
        .limit(200);

      if (err) throw err;
      setRows((data as ProfileRow[]) ?? []);
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
    const matchesSearch = name.toLowerCase().includes(query.toLowerCase()) || 
                          email.toLowerCase().includes(query.toLowerCase());
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
      <div className="max-w-7xl mx-auto flex flex-col gap-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-text-primary font-display">
              Base de Alunos
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Gestão de performance, vínculo e acompanhamento dos seus alunos
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/alunos/novo")}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand hover:bg-brand-hover text-text-on-brand text-xs font-semibold rounded-lg transition-all active:scale-95 shadow-md shadow-brand/10 w-fit"
          >
            <Plus size={13} weight="bold" /> Adicionar Aluno
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <DumbbellLoader text="Sincronizando base de alunos..." />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-surface-1 border border-border-subtle rounded-xl overflow-hidden shadow-sm">
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
                <div key={label} className="bg-surface-1 rounded-lg p-4 border border-border-subtle shadow-sm flex flex-col justify-center h-20">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />
                    <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{label}</span>
                  </div>
                  <span className="text-xl font-bold tracking-tight text-text-primary mt-1.5 font-mono tabular-nums leading-none">{value}</span>
                </div>
              ))}
            </div>

            {/* ── Filters and Search Line ── */}
            <div className="bg-surface-1 border border-border-subtle rounded-lg p-2.5 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-sm">
              <div className="relative w-full lg:max-w-[280px]">
                <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Localizar por nome ou e-mail..."
                  className="w-full pl-9 pr-4 h-8.5 bg-surface-2 border border-border-subtle rounded-md text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand/40 transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto lg:justify-end">
                {/* Status Filter — segmented control (largura igual no mobile) */}
                <div className="grid grid-cols-4 sm:flex sm:items-center gap-1 bg-surface-2 border border-border-subtle rounded-md p-1 h-8.5">
                  {(['todos', 'ativos', 'pendentes', 'inativos'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        "w-full sm:w-auto px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-all h-6.5 flex items-center justify-center",
                        statusFilter === status
                          ? "bg-surface-0 border border-border-subtle/50 text-text-primary shadow-sm"
                          : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {/* Dropdowns + reset — mesma linha e altura */}
                <div className="grid grid-cols-[1fr_1fr_auto] sm:flex sm:items-center gap-2 sm:gap-2.5">
                  {/* Plan Filter */}
                  <select
                    value={planoFilter}
                    onChange={(e) => setPlanoFilter(e.target.value as any)}
                    className="w-full min-w-0 px-2.5 h-8.5 bg-surface-2 border border-border-subtle rounded-md text-xs text-text-secondary focus:outline-none focus:border-brand/40"
                  >
                    <option value="todos">Todos os planos</option>
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>

                  {/* Sorting Select */}
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as any)}
                    className="w-full min-w-0 px-2.5 h-8.5 bg-surface-2 border border-border-subtle rounded-md text-xs text-text-secondary focus:outline-none focus:border-brand/40"
                  >
                    <option value="atividade">Última atividade</option>
                    <option value="recentes">Mais recentes</option>
                    <option value="vencimento">Vencimento</option>
                    <option value="nome">Nome</option>
                  </select>

                  {/* Reset filters */}
                  <button
                    onClick={handleResetFilters}
                    className="w-8.5 h-8.5 shrink-0 flex items-center justify-center bg-surface-2 hover:bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary rounded-md transition-colors"
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
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-12 text-center max-w-md mx-auto shadow-sm">
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
              <div className="bg-surface-1 border border-border-subtle rounded-xl p-3 shadow-sm">
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
                            ? "bg-surface-3 text-text-disabled border-border-subtle"
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
                          <span className="capitalize">{row.tipo_plano || "Mensal"}</span>
                          <span className="text-text-tertiary">•</span>
                          <span>
                            {row.ultimo_checkin ? timeAgo(row.ultimo_checkin) : "Sem registros"}
                          </span>
                          {expiration && (
                            <>
                              <span className="text-text-tertiary">•</span>
                              <span>vence {expiration.toLocaleDateString("pt-BR")}</span>
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
              <div className="bg-surface-1 border border-border-subtle rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-border-subtle bg-surface-2/40">
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
                        const alerta = isArquivado ? null : nivelAlerta(dias, row.tipo_plano);

                        return (
                          <tr
                            key={row.id}
                            onClick={() => router.push(`/admin/aluno/${row.id}`)}
                            className={cn(
                              "border-b border-border-subtle/50 last:border-b-0 cursor-pointer transition-colors hover:bg-surface-2/40",
                              isArquivado && "opacity-60",
                              alerta === 'vencido' && "bg-danger/5 hover:bg-danger/10"
                            )}
                          >
                            {/* Avatar & Name */}
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-7 h-7 rounded-md bg-gradient-to-br flex items-center justify-center font-bold text-[10px] text-white overflow-hidden shrink-0",
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
                                  ? "bg-surface-3 text-text-disabled border-border-subtle"
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
                              {row.tipo_plano || "Mensal"}
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
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-2 border border-border-subtle text-text-tertiary text-[9px] font-semibold uppercase tracking-wider">
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
                  <div className="px-3 pb-3">
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
    </div>
  );
}
