"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/app/components/AuthProvider";
import { MagnifyingGlass, Plus, Users, TrendUp, WarningCircle, CaretRight, Bell } from "@phosphor-icons/react";
import { getPublicStorageUrl } from "@/lib/storageUrls";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { cn } from "@/lib/utils/cn";

interface ProfileRow {
  id: string;
  coaching_reference?: string | null;
  email?: string | null;
  status_pagamento?: string | null;
  tipo_plano?: string | null;
  ultimo_checkin?: string | null;
  avatar_url?: string | null;
  data_expiracao?: string | null;
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
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (q = "") => {
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

      let qb = supabaseClient
        .from("profiles")
        .select("id, coaching_reference, email, status_pagamento, tipo_plano, ultimo_checkin, avatar_url, data_expiracao, arquivado")
        .in("id", ids)
        .order("arquivado", { ascending: true, nullsFirst: true })
        .order("ultimo_checkin", { ascending: false, nullsFirst: false })
        .limit(200);

      if (q.trim()) {
        qb = qb.or(`coaching_reference.ilike.%${q}%,email.ilike.%${q}%`);
      }

      const { data, error: err } = await qb;
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
  }, [authLoading, user?.id]);

  const inativos   = rows.filter(r => r.arquivado).length;
  const ativos    = rows.filter(r => !r.arquivado && r.status_pagamento === "pago").length;
  const pendentes = rows.filter(r => !r.arquivado && r.status_pagamento !== "pago").length;

  const alertasMes = rows.filter(r => !r.arquivado && nivelAlerta(diasRestantes(r.data_expiracao), r.tipo_plano) === 'mes');
  const alertasSemana = rows.filter(r => !r.arquivado && nivelAlerta(diasRestantes(r.data_expiracao), r.tipo_plano) === 'semana');
  const alertasVencidos = rows.filter(r => !r.arquivado && nivelAlerta(diasRestantes(r.data_expiracao), r.tipo_plano) === 'vencido');

  return (
    <div className="min-h-screen bg-surface-0 pb-28 lg:pl-28">

      {/* ── Header ── */}
      <div className="px-4 pt-8 pb-5 max-w-2xl mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Base de Atletas</h1>
            <p className="text-xs text-text-tertiary mt-0.5">Gestão de performance</p>
          </div>
          <button
            onClick={() => router.push("/admin/alunos/novo")}
            className="w-10 h-10 rounded-xl bg-brand shadow-glow-brand flex items-center justify-center text-text-on-brand active:scale-90 transition-transform"
          >
            <Plus size={20} weight="bold" />
          </button>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto flex flex-col gap-4">

        {/* ── Stats bar ── */}
        {!loading && rows.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Ativos",    value: ativos,    icon: TrendUp,  color: "text-success",        bg: "bg-success-subtle" },
              { label: "Pendentes", value: pendentes, icon: WarningCircle, color: "text-warning",        bg: "bg-warning-subtle" },
              { label: "Total",     value: rows.filter(r => !r.arquivado).length, icon: Users, color: "text-text-secondary", bg: "bg-surface-3" },
              { label: "Inativos",  value: inativos,  icon: Users,       color: "text-text-disabled",  bg: "bg-surface-3"      },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-surface-2 rounded-2xl p-3.5 shadow-elev-1 border border-border-subtle flex flex-col gap-1.5">
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", bg)}>
                  <Icon size={14} className={color} />
                </div>
                <p className="text-2xl font-bold text-text-primary leading-none tabular-nums">{value}</p>
                <p className="text-2xs text-text-tertiary">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Alertas de vencimento ── */}
        {!loading && alertasVencidos.length > 0 && (
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-danger/15 border border-danger/30">
            <Bell className="w-4 h-4 text-danger mt-0.5 flex-shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-danger mb-1">Planos vencidos</p>
              <div className="flex flex-wrap gap-1.5">
                {alertasVencidos.map(r => {
                  const nome = r.coaching_reference || r.email?.split('@')[0] || 'Aluno';
                  const dias = diasRestantes(r.data_expiracao);
                  const diasVencidos = dias !== null ? Math.abs(dias) : 0;
                  return (
                    <button key={r.id} onClick={() => router.push(`/admin/aluno/${r.id}`)}
                      className="text-2xs px-2 py-1 bg-danger/20 border border-danger/30 rounded-lg text-danger font-medium hover:bg-danger/30 transition-colors">
                      {nome} · {diasVencidos === 0 ? 'venceu hoje' : diasVencidos === 1 ? 'venceu ontem' : `venceu há ${diasVencidos}d`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!loading && alertasSemana.length > 0 && (
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-danger/10 border border-danger/20">
            <Bell className="w-4 h-4 text-danger mt-0.5 flex-shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-danger mb-1">Planos a vencer em até 7 dias</p>
              <div className="flex flex-wrap gap-1.5">
                {alertasSemana.map(r => {
                  const nome = r.coaching_reference || r.email?.split('@')[0] || 'Aluno';
                  const dias = diasRestantes(r.data_expiracao);
                  return (
                    <button key={r.id} onClick={() => router.push(`/admin/aluno/${r.id}`)}
                      className="text-2xs px-2 py-1 bg-danger/20 border border-danger/30 rounded-lg text-danger font-medium hover:bg-danger/30 transition-colors">
                      {nome} · {dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `${dias}d`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!loading && alertasMes.length > 0 && (
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <Bell className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-300 mb-1">Planos longos a vencer em até 30 dias</p>
              <div className="flex flex-wrap gap-1.5">
                {alertasMes.map(r => {
                  const nome = r.coaching_reference || r.email?.split('@')[0] || 'Aluno';
                  const dias = diasRestantes(r.data_expiracao);
                  return (
                    <button key={r.id} onClick={() => router.push(`/admin/aluno/${r.id}`)}
                      className="text-2xs px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-300 font-medium hover:bg-amber-500/30 transition-colors capitalize">
                      {nome} · {r.tipo_plano} · {dias}d
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Search ── */}
        <div className="relative">
          <MagnifyingGlass size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) fetchData("");
            }}
            onKeyDown={(e) => e.key === "Enter" && fetchData(query)}
            placeholder="Localizar atleta..."
            suppressHydrationWarning
            className="w-full pl-11 pr-4 py-3 bg-surface-2 border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand/40 shadow-elev-1 transition-all"
          />
        </div>

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-sm">
            {error}
          </div>
        )}

        {/* ── Athlete list ── */}
        {(authLoading || loading) ? (
          <div className="flex items-center justify-center py-24">
            <DumbbellLoader text="Sincronizando base..." />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-24 bg-surface-2 border border-dashed border-border-subtle rounded-2xl shadow-elev-1">
            <Users size={32} className="text-text-disabled mx-auto mb-3" />
            <p className="text-text-disabled text-xs uppercase tracking-caps">Nenhum atleta localizado.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((r) => {
              const name    = r.coaching_reference || r.email || "?";
              const initial = name[0].toUpperCase();
              const isAtivo = r.status_pagamento === "pago";
              const isArquivado = !!r.arquivado;
              const lastSeen = timeAgo(r.ultimo_checkin);
              const dias = diasRestantes(r.data_expiracao);
              const alerta = isArquivado ? null : nivelAlerta(dias, r.tipo_plano);

              return (
                <button
                  key={r.id}
                  onClick={() => router.push(`/admin/aluno/${r.id}`)}
                  className={cn(
                    "w-full text-left shadow-elev-1 hover:shadow-elev-2 p-4 rounded-2xl transition-all active:scale-[0.99] flex items-center gap-3.5 group",
                    isArquivado
                      ? "bg-surface-2/50 border border-border-subtle opacity-60 hover:opacity-80"
                      : alerta === 'vencido'
                        ? "bg-danger/5 border border-danger/20 hover:border-danger/40 hover:bg-danger/10"
                        : "bg-surface-1 border border-border-subtle hover:border-brand/25 hover:bg-surface-2"
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "w-11 h-11 rounded-2xl bg-gradient-to-br shrink-0 flex items-center justify-center font-bold text-lg text-white overflow-hidden",
                    isArquivado ? "grayscale" : avatarGrad(name)
                  )}>
                    {r.avatar_url
                      ? <img src={getPublicStorageUrl('avatars', r.avatar_url) ?? r.avatar_url} alt={name} className="w-full h-full object-cover" />
                      : initial
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn(
                        "text-sm font-semibold truncate transition-colors",
                        isArquivado ? "text-text-disabled" : alerta === 'vencido' ? "text-danger" : "text-text-primary group-hover:text-brand"
                      )}>
                        {name}
                      </span>
                      {isArquivado ? (
                        <span className="shrink-0 text-2xs font-semibold uppercase tracking-caps px-1.5 py-0.5 rounded-md bg-surface-3 text-text-disabled border border-border-subtle">
                          Desativado
                        </span>
                      ) : (
                        <>
                          <span className={cn(
                            "shrink-0 w-1.5 h-1.5 rounded-full",
                            isAtivo ? "bg-success" : "bg-warning"
                          )} />
                          {(alerta === 'vencido' || alerta === 'semana') && (
                            <Bell className="w-3 h-3 text-danger flex-shrink-0" />
                          )}
                          {alerta === 'mes' && (
                            <Bell className="w-3 h-3 text-amber-400 flex-shrink-0" />
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                      {isArquivado ? (
                        <span className="text-text-disabled">Clique para reativar</span>
                      ) : (
                        <>
                          <span className="capitalize">{r.tipo_plano ?? "mensal"}</span>
                          {alerta === 'vencido' && dias !== null && (
                            <span className="text-danger font-semibold">· {Math.abs(dias) === 0 ? 'venceu hoje' : Math.abs(dias) === 1 ? 'venceu ontem' : `venceu há ${Math.abs(dias)}d`}</span>
                          )}
                          {alerta === 'semana' && dias !== null && (
                            <span className="text-danger font-semibold">· vence em {dias <= 0 ? 'hoje' : dias === 1 ? 'amanhã' : `${dias}d`}</span>
                          )}
                          {alerta === 'mes' && dias !== null && (
                            <span className="text-amber-400 font-semibold">· {dias}d restantes</span>
                          )}
                          {!alerta && lastSeen && (
                            <>
                              <span className="text-text-disabled">·</span>
                              <span>{lastSeen}</span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Chevron */}
                  <div className="w-7 h-7 rounded-xl bg-surface-3 group-hover:bg-brand group-hover:shadow-glow-brand flex items-center justify-center text-text-disabled group-hover:text-text-on-brand shrink-0 transition-all">
                    <CaretRight size={14} weight="bold" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
