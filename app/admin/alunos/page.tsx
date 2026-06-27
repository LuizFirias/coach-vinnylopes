"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/app/components/AuthProvider";
import { Plus, Users, TrendUp, WarningCircle, Bell } from "@phosphor-icons/react";
import { getPublicStorageUrl } from "@/lib/storageUrls";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { cn } from "@/lib/utils/cn";
import PageHeader from "@/app/components/PageHeader";
import DataTable from "@/app/components/DataTable";
import SlideOverPanel from "@/app/components/SlideOverPanel";

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
  valor_plano?: number | null;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Slide Over states
  const [selectedStudent, setSelectedStudent] = useState<ProfileRow | null>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);

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
        .select("id, coaching_reference, email, status_pagamento, tipo_plano, ultimo_checkin, avatar_url, data_expiracao, arquivado, valor_plano")
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
  }, [authLoading, user?.id]);

  const inativos   = rows.filter(r => r.arquivado).length;
  const ativos    = rows.filter(r => !r.arquivado && r.status_pagamento === "pago").length;
  const pendentes = rows.filter(r => !r.arquivado && r.status_pagamento !== "pago").length;

  const alertasMes = rows.filter(r => !r.arquivado && nivelAlerta(diasRestantes(r.data_expiracao), r.tipo_plano) === 'mes');
  const alertasSemana = rows.filter(r => !r.arquivado && nivelAlerta(diasRestantes(r.data_expiracao), r.tipo_plano) === 'semana');
  const alertasVencidos = rows.filter(r => !r.arquivado && nivelAlerta(diasRestantes(r.data_expiracao), r.tipo_plano) === 'vencido');

  const columns = [
    {
      key: 'coaching_reference',
      label: 'Atleta',
      sortable: true,
      render: (row: ProfileRow) => {
        const name = row.coaching_reference || row.email || "?";
        const initial = name[0].toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white overflow-hidden shrink-0 shadow-sm border border-border-subtle",
              row.arquivado ? "grayscale bg-surface-3" : avatarGrad(name)
            )}>
              {row.avatar_url ? (
                <img src={getPublicStorageUrl('avatars', row.avatar_url) ?? row.avatar_url} alt={name} className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-text-primary truncate">{name}</span>
              <span className="text-[10px] text-text-secondary truncate">{row.email}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'tipo_plano',
      label: 'Plano',
      sortable: true,
      render: (row: ProfileRow) => (
        <span className="capitalize font-semibold text-xs">
          {row.tipo_plano || 'mensal'}
        </span>
      )
    },
    {
      key: 'status_pagamento',
      label: 'Status',
      sortable: true,
      render: (row: ProfileRow) => {
        if (row.arquivado) {
          return (
            <span className="badge bg-surface-3 border border-border-default text-text-disabled uppercase font-bold text-[9px] tracking-wide px-1.5 py-0.5 rounded-[4px]">
              Desativado
            </span>
          );
        }
        const isAtivo = row.status_pagamento === "pago";
        return (
          <span className={cn(
            "badge uppercase font-bold text-[9px] tracking-wide px-1.5 py-0.5 rounded-[4px]",
            isAtivo ? "badge-success" : "badge-danger"
          )}>
            {isAtivo ? 'Ativo' : 'Pendente'}
          </span>
        );
      }
    },
    {
      key: 'data_expiracao',
      label: 'Renovação',
      sortable: true,
      render: (row: ProfileRow) => {
        if (row.arquivado) return <span className="text-text-tertiary">—</span>;
        const dias = diasRestantes(row.data_expiracao);
        const alerta = nivelAlerta(dias, row.tipo_plano);
        if (alerta === 'vencido' && dias !== null) {
          return (
            <span className="text-danger font-bold text-xs">
              Vencido {Math.abs(dias) === 0 ? 'hoje' : Math.abs(dias) === 1 ? 'ontem' : `há ${Math.abs(dias)}d`}
            </span>
          );
        }
        if (alerta === 'semana' && dias !== null) {
          return (
            <span className="text-danger font-bold text-xs">
              Vence em {dias <= 0 ? 'hoje' : dias === 1 ? 'amanhã' : `${dias}d`}
            </span>
          );
        }
        if (alerta === 'mes' && dias !== null) {
          return (
            <span className="text-amber-400 font-bold text-xs">
              {dias}d restantes
            </span>
          );
        }
        return (
          <span className="text-text-secondary text-xs">
            {row.data_expiracao ? new Date(row.data_expiracao).toLocaleDateString('pt-BR') : '—'}
          </span>
        );
      }
    },
    {
      key: 'ultimo_checkin',
      label: 'Última Atividade',
      sortable: true,
      render: (row: ProfileRow) => {
        const lastSeen = timeAgo(row.ultimo_checkin);
        return <span className="text-text-secondary text-xs">{lastSeen || '—'}</span>;
      }
    }
  ];

  const handleRowClick = (row: ProfileRow) => {
    setSelectedStudent(row);
    setSlideOverOpen(true);
  };

  return (
    <div className="max-w-[1440px] px-6 md:px-10 py-8 mx-auto w-full flex flex-col gap-6 animate-fade-in">
      <PageHeader 
        title="Base de Atletas" 
        subtitle="Gestão e acompanhamento de performance de atletas"
        actions={
          <button
            onClick={() => router.push("/admin/alunos/novo")}
            className="btn-primary h-10 px-4 bg-brand text-text-on-brand rounded-md text-xs font-bold shadow-sm shadow-brand/20 hover:opacity-95 transition-all flex items-center gap-1.5"
            style={{ width: 'auto', minHeight: '40px' }}
          >
            <Plus size={16} weight="bold" />
            Adicionar Atleta
          </button>
        }
      />

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger text-xs flex items-center gap-2">
          <WarningCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats bar */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Ativos", value: ativos, icon: TrendUp, color: "text-success", bg: "bg-success-subtle" },
            { label: "Pendentes", value: pendentes, icon: WarningCircle, color: "text-warning", bg: "bg-warning-subtle" },
            { label: "Total", value: rows.filter(r => !r.arquivado).length, icon: Users, color: "text-text-secondary", bg: "bg-surface-2" },
            { label: "Inativos", value: inativos, icon: Users, color: "text-text-disabled", bg: "bg-surface-2" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-surface-1 rounded-lg p-4 border border-border-subtle flex items-center gap-4 shadow-sm">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-xl font-black text-text-primary font-mono leading-none tabular-nums">{value}</p>
                <p className="text-2xs text-text-secondary mt-1">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alertas de vencimento */}
      {!loading && alertasVencidos.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg">
          <Bell className="w-4 h-4 text-danger mt-0.5 flex-shrink-0 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-2xs font-extrabold uppercase tracking-caps text-danger mb-1.5">Planos vencidos</p>
            <div className="flex flex-wrap gap-1.5">
              {alertasVencidos.map(r => {
                const nome = r.coaching_reference || r.email?.split('@')[0] || 'Aluno';
                const dias = diasRestantes(r.data_expiracao);
                const diasVencidos = dias !== null ? Math.abs(dias) : 0;
                return (
                  <button key={r.id} onClick={() => router.push(`/admin/aluno/${r.id}`)}
                    className="text-2xs px-2 py-1 bg-danger/20 border border-danger/30 rounded text-danger font-medium hover:bg-danger/30 transition-colors">
                    {nome} · {diasVencidos === 0 ? 'venceu hoje' : diasVencidos === 1 ? 'venceu ontem' : `venceu há ${diasVencidos}d`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!loading && alertasSemana.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-danger/5 border border-danger/15 rounded-lg">
          <Bell className="w-4 h-4 text-danger mt-0.5 flex-shrink-0 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-2xs font-extrabold uppercase tracking-caps text-danger mb-1.5">Planos a vencer em até 7 dias</p>
            <div className="flex flex-wrap gap-1.5">
              {alertasSemana.map(r => {
                const nome = r.coaching_reference || r.email?.split('@')[0] || 'Aluno';
                const dias = diasRestantes(r.data_expiracao);
                return (
                  <button key={r.id} onClick={() => router.push(`/admin/aluno/${r.id}`)}
                    className="text-2xs px-2 py-1 bg-danger/20 border border-danger/30 rounded text-danger font-medium hover:bg-danger/30 transition-colors">
                    {nome} · {dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `${dias}d`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!loading && alertasMes.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/5 border border-amber-500/15 rounded-lg">
          <Bell className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-2xs font-extrabold uppercase tracking-caps text-amber-300 mb-1.5">Planos longos a vencer em até 30 dias</p>
            <div className="flex flex-wrap gap-1.5">
              {alertasMes.map(r => {
                const nome = r.coaching_reference || r.email?.split('@')[0] || 'Aluno';
                const dias = diasRestantes(r.data_expiracao);
                return (
                  <button key={r.id} onClick={() => router.push(`/admin/aluno/${r.id}`)}
                    className="text-2xs px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-amber-300 font-medium hover:bg-amber-500/30 transition-colors">
                    {nome} · {r.tipo_plano} · {dias}d
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Table base */}
      {loading || authLoading ? (
        <div className="flex items-center justify-center py-24">
          <DumbbellLoader text="Sincronizando base de atletas..." />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          onRowClick={handleRowClick}
          searchable
          searchPlaceholder="Localizar atleta..."
          pagination={{ pageSize: 12 }}
        />
      )}

      {/* Athlete Detail SlideOver */}
      <SlideOverPanel
        open={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        title={selectedStudent?.coaching_reference || selectedStudent?.email || "Detalhes do Atleta"}
        expandUrl={selectedStudent ? `/admin/aluno/${selectedStudent.id}` : undefined}
      >
        {selectedStudent && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Student Info Profile Box */}
            <div className="flex flex-col items-center text-center gap-3 bg-surface-2 border border-border-subtle p-5 rounded-lg shadow-sm">
              <div className={cn(
                "w-16 h-16 rounded-full bg-linear-to-br flex items-center justify-center font-bold text-2xl text-white overflow-hidden shadow-md",
                selectedStudent.arquivado ? "grayscale bg-surface-3" : avatarGrad(selectedStudent.coaching_reference || selectedStudent.email || "?")
              )}>
                {selectedStudent.avatar_url ? (
                  <img src={getPublicStorageUrl('avatars', selectedStudent.avatar_url) ?? selectedStudent.avatar_url} alt={selectedStudent.coaching_reference || ""} className="w-full h-full object-cover" />
                ) : (
                  (selectedStudent.coaching_reference || selectedStudent.email || "?")[0].toUpperCase()
                )}
              </div>
              <div className="min-w-0 w-full">
                <h3 className="text-sm font-bold text-text-primary truncate">
                  {selectedStudent.coaching_reference || "Atleta"}
                </h3>
                <p className="text-2xs text-text-secondary mt-0.5 truncate">
                  {selectedStudent.email}
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-2 border border-border-subtle p-3.5 rounded-lg text-center flex flex-col items-center justify-center">
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-caps block mb-1.5">Status Plano</span>
                <span className={cn(
                  "badge uppercase font-bold text-[9px] tracking-wide px-1.5 py-0.5 rounded-[4px]",
                  selectedStudent.arquivado 
                    ? "bg-surface-3 text-text-disabled" 
                    : selectedStudent.status_pagamento === "pago" ? "badge-success" : "badge-danger"
                )}>
                  {selectedStudent.arquivado ? 'Desativado' : selectedStudent.status_pagamento === "pago" ? 'Ativo' : 'Pendente'}
                </span>
              </div>
              <div className="bg-surface-2 border border-border-subtle p-3.5 rounded-lg text-center flex flex-col items-center justify-center">
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-caps block mb-1.5">Modalidade</span>
                <span className="text-xs font-semibold text-text-primary capitalize">
                  {selectedStudent.tipo_plano || 'mensal'}
                </span>
              </div>
            </div>

            {/* General actions */}
            <div className="flex flex-col gap-2.5 mt-2">
              <button
                onClick={() => {
                  setSlideOverOpen(false);
                  router.push(`/admin/aluno/${selectedStudent.id}`);
                }}
                className="w-full h-10 bg-brand text-text-on-brand hover:bg-brand-hover rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                Ver Perfil Completo
              </button>
              
              <button
                onClick={() => {
                  setSlideOverOpen(false);
                  router.push(`/admin/aluno/${selectedStudent.id}?tab=treinos`);
                }}
                className="w-full h-10 bg-surface-2 hover:bg-surface-3 text-text-primary rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-border-subtle"
              >
                Gerenciar Fichas de Treino
              </button>

              <button
                onClick={() => {
                  setSlideOverOpen(false);
                  router.push(`/admin/aluno/${selectedStudent.id}?tab=nutricao`);
                }}
                className="w-full h-10 bg-surface-2 hover:bg-surface-3 text-text-primary rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-border-subtle"
              >
                Acompanhar Nutrição
              </button>
            </div>
          </div>
        )}
      </SlideOverPanel>
    </div>
  );
}
