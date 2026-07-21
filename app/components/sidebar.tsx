"use client";

import { useState, useEffect, type ComponentType } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAuth } from './AuthProvider';
import { cn } from '@/lib/utils/cn';
import { getPlanLabel } from '@/lib/subscriptions/plans';
import { fetchSubscriptionStatusCached } from '@/lib/subscriptions/statusClientCache';
import {
  Barbell,
  ForkKnife,
  Ruler,
  Camera,
  Handshake,
  Trophy,
  User,
  SignOut,
  List,
  X,
  Users,
  SquaresFour,
  ShieldWarning,
  Gear,
  AppleLogo,
  BookOpen,
  ChatCircle,
  ChartBar,
  CaretLeft,
  CaretRight
} from '@phosphor-icons/react';

type IconComponent = ComponentType<{ size?: number | string; weight?: 'fill' | 'regular'; className?: string }>;

type MenuItem = {
  id: string;
  name: string;
  href: string;
  icon: IconComponent;
};

type MenuGroup = {
  label: string;
  items: string[];
};

const alunoMenuItems: MenuItem[] = [
  { id: 'dashboard', name: 'Dashboard', href: '/aluno/dashboard', icon: SquaresFour },
  { id: 'treinos', name: 'Treinos', href: '/aluno/treinos', icon: Barbell },
  { id: 'plano-alimentar', name: 'Plano Alimentar', href: '/aluno/plano-alimentar', icon: ForkKnife },
  { id: 'medidas', name: 'Medidas', href: '/aluno/medidas', icon: Ruler },
  { id: 'fotos', name: 'Fotos', href: '/aluno/fotos', icon: Camera },
  { id: 'ranking', name: 'Ranking', href: '/aluno/ranking', icon: Trophy },
  { id: 'perfil', name: 'Perfil', href: '/aluno/perfil', icon: User },
];

const coachItemConfig: Record<string, MenuItem> = {
  dashboard: { id: 'dashboard', name: 'Dashboard', href: '/admin/dashboard', icon: SquaresFour },
  alunos: { id: 'alunos', name: 'Alunos', href: '/admin/alunos', icon: Users },
  treinos: { id: 'treinos', name: 'Treinos', href: '/admin/treinos', icon: Barbell },
  nutricao: { id: 'nutricao', name: 'Nutrição', href: '/admin/nutricao', icon: AppleLogo },
  biblioteca: { id: 'biblioteca', name: 'Biblioteca', href: '/admin/biblioteca-exercicios', icon: BookOpen },
  financeiro: { id: 'financeiro', name: 'Financeiro', href: '/admin/relatorios', icon: ChartBar },
  parceiros: { id: 'parceiros', name: 'Parceiros', href: '/admin/parceiros', icon: Handshake },
  ranking: { id: 'ranking', name: 'Ranking', href: '/admin/ranking', icon: Trophy },
  convites: { id: 'convites', name: 'Convites', href: '/super-admin/convites', icon: Handshake },
  feedbacks: { id: 'feedbacks', name: 'Feedbacks', href: '/admin/feedbacks', icon: ChatCircle },
  'master-control': { id: 'master-control', name: 'Master Control', href: '/super-admin', icon: ShieldWarning },
  'perfil-master': { id: 'perfil-master', name: 'Perfil Master', href: '/super-admin/perfil', icon: Gear },
  perfil: { id: 'perfil', name: 'Perfil', href: '/admin/perfil', icon: User },
};

const coachMenuGroups: MenuGroup[] = [
  { label: 'Visão geral', items: ['dashboard'] },
  { label: 'Alunos', items: ['alunos', 'treinos', 'nutricao', 'biblioteca'] },
  { label: 'Negócio', items: ['financeiro', 'parceiros', 'ranking', 'convites'] },
  { label: 'Sistema', items: ['feedbacks', 'master-control', 'perfil-master', 'perfil'] },
];

function resolveCoachGroups(isSuperAdmin: boolean): { label: string; items: MenuItem[] }[] {
  const hidden = isSuperAdmin
    ? new Set(['perfil'])
    : new Set(['convites', 'master-control', 'perfil-master']);

  return coachMenuGroups
    .map((group) => ({
      label: group.label,
      items: group.items
        .filter((id) => !hidden.has(id))
        .map((id) => coachItemConfig[id])
        .filter(Boolean),
    }))
    .filter((group) => group.items.length > 0);
}

type PlanIndicatorState = {
  show: boolean;
  label: string;
  studentCount: number;
  studentLimit: number;
  isActive: boolean;
};

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const { userRole, loading, user } = useAuth();
  const pathname = usePathname();

  const [isExpanded, setIsExpanded] = useState(true);
  const [planIndicator, setPlanIndicator] = useState<PlanIndicatorState | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-expanded');
    const expanded = saved !== 'false';
    setIsExpanded(expanded);
    document.documentElement.style.setProperty('--sidebar-width', expanded ? '240px' : '80px');
  }, []);

  useEffect(() => {
    if (!user || userRole === 'aluno' || userRole === 'super_admin' || !userRole) {
      setPlanIndicator(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;

        const resData = await fetchSubscriptionStatusCached(token);
        if (!resData || cancelled) return;

        const data = resData;

        const accountType = data.accountType as string | undefined;
        if (
          data.isSuperAdmin ||
          accountType === 'teste' ||
          accountType === 'parceiro' ||
          data.studentLimit == null
        ) {
          setPlanIndicator({ show: false, label: '', studentCount: 0, studentLimit: 0, isActive: true });
          return;
        }

        const label =
          data.currentPlan?.label ||
          getPlanLabel(data.planTier) ||
          'AuronFit';

        setPlanIndicator({
          show: true,
          label,
          studentCount: data.activeStudentCount ?? 0,
          studentLimit: data.studentLimit,
          isActive: data.isActive !== false,
        });
      } catch {
        if (!cancelled) setPlanIndicator(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, userRole]);

  const toggleSidebar = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    localStorage.setItem('sidebar-expanded', String(next));
    document.documentElement.style.setProperty('--sidebar-width', next ? '240px' : '80px');
  };

  // Ocultar em rotas públicas ou enquanto carrega
  if (
    pathname === '/login' ||
    pathname === '/' ||
    pathname?.startsWith('/auth/') ||
    pathname?.startsWith('/signup') ||
    pathname === '/aluno/trocar-senha' ||
    pathname === '/admin/trocar-senha' ||
    pathname === '/aluno/onboarding' ||
    loading
  ) {
    return null;
  }

  // Se não há usuário autenticado, não renderizar
  if (!user) {
    return null;
  }

  const isAluno = userRole === 'aluno';
  const isSuperAdmin = userRole === 'super_admin';
  const coachGroups = isAluno ? [] : resolveCoachGroups(isSuperAdmin);
  const flatMobileItems = isAluno
    ? alunoMenuItems
    : coachGroups.flatMap((g) => g.items);

  const showPlanIndicator = Boolean(isExpanded && planIndicator?.show);

  const renderNavLink = (m: MenuItem, opts?: { onNavigate?: () => void; mobile?: boolean }) => {
    const Icon = m.icon;
    const isActive = pathname === m.href;

    if (opts?.mobile) {
      return (
        <Link
          key={m.href}
          href={m.href}
          className={`flex items-center gap-3 px-3 py-3 rounded-lg text-[10px] uppercase tracking-widest transition-all group ${
            isActive ? 'bg-brand text-black shadow-lg shadow-brand/20' : 'text-text-secondary hover:text-brand hover:bg-brand/5'
          }`}
          onClick={opts.onNavigate}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all shadow-sm border ${
            isActive ? 'bg-brand/20 border-brand/30' : 'bg-surface-2 border-border-subtle'
          }`}>
            <Icon size={16} weight={isActive ? 'fill' : 'regular'} />
          </div>
          {m.name}
        </Link>
      );
    }

    return (
      <Link
        key={m.href}
        href={m.href}
        title={!isExpanded ? m.name : undefined}
        className={cn(
          "flex items-center gap-2.5 px-2.5 h-9 transition-all group relative",
          isActive
            ? "bg-brand/12 text-text-primary font-medium border-l-2 border-brand rounded-r-lg rounded-l-none"
            : "text-text-disabled hover:text-brand hover:bg-brand/5 rounded-lg",
          isExpanded ? "justify-start" : "justify-center"
        )}
      >
        {isActive && !isExpanded && <div className="absolute left-0 w-1 h-4 bg-brand rounded-r-full" />}
        <Icon size={15} weight={isActive ? 'fill' : 'regular'} className={cn(!isActive && 'group-hover:scale-105 transition-transform shrink-0')} />

        {isExpanded && (
          <span className="text-[11px] font-medium tracking-wide truncate">
            {m.name}
          </span>
        )}

        {!isExpanded && (
          <div className="absolute left-full ml-4 px-2 py-1 bg-surface-1/95 backdrop-blur-xl text-text-primary text-[10px] tracking-wider rounded border border-border-subtle pointer-events-none opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-100 shadow-xl">
            {m.name}
          </div>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Sidebar for Desktop */}
      <aside
        style={{ width: isExpanded ? '240px' : '80px' }}
        className="hidden lg:flex fixed left-0 top-0 h-full min-h-0 bg-surface-1 border-r border-border-subtle flex-col py-3 px-3 items-stretch z-60 shadow-2xl transition-[width] duration-300 overflow-hidden"
      >
        <div className="flex flex-col items-center gap-2 mb-3 px-2 relative shrink-0">
          <Link href={isAluno ? '/aluno/dashboard' : '/admin/dashboard'} className="flex items-center justify-center group cursor-pointer">
            <Image
              src="/LOGO-AURON.webp"
              alt="Auronfit"
              width={isExpanded ? 40 : 36}
              height={isExpanded ? 40 : 36}
              className={cn(
                "object-contain group-hover:scale-105 transition-transform",
                isExpanded ? "w-10 h-10" : "w-9 h-9"
              )}
            />
          </Link>

          <button
            onClick={toggleSidebar}
            className={cn(
              "w-6 h-6 rounded-md border border-border-subtle bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-text-secondary hover:text-brand transition-colors shrink-0",
              isExpanded ? "absolute right-1 top-1/2 -translate-y-1/2" : "mt-0.5"
            )}
            title={isExpanded ? "Recolher menu" : "Expandir menu"}
          >
            {isExpanded ? <CaretLeft size={13} /> : <CaretRight size={13} />}
          </button>
        </div>

        <nav className="flex flex-col flex-1 min-h-0 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {isAluno ? (
            <div className="flex flex-col gap-0.5">
              {alunoMenuItems.map((m) => renderNavLink(m))}
            </div>
          ) : (
            coachGroups.map((group, groupIdx) => (
              <div
                key={group.label}
                className="flex flex-col gap-0.5"
                style={{ marginTop: groupIdx === 0 ? 0 : 20 }}
              >
                {isExpanded && (
                  <div
                    className="px-2.5"
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      color: '#3a3a3a',
                      marginBottom: 8,
                    }}
                  >
                    {group.label}
                  </div>
                )}
                {group.items.map((m) => renderNavLink(m))}
              </div>
            ))
          )}
        </nav>

        <div className="mt-auto shrink-0">
          {showPlanIndicator && planIndicator && (
            <div
              style={{
                fontSize: 11,
                color: planIndicator.isActive ? '#3a3a3a' : '#e05555',
                padding: '12px 16px',
                borderTop: '1px solid #1a1a1a',
              }}
            >
              {planIndicator.label} · {planIndicator.studentCount}/{planIndicator.studentLimit} alunos
            </div>
          )}

          <div
            className={cn(
              "pt-2.5 pb-1 flex flex-col gap-1.5",
              !showPlanIndicator && "border-t border-border-subtle"
            )}
          >
            {isExpanded && user && (
              <div className="flex flex-col min-w-0 px-2 py-0.5">
                <span className="text-[8px] font-semibold text-text-tertiary uppercase tracking-[0.06em] mb-0.5">
                  Acesso
                </span>
                <span className="text-[10px] font-bold text-text-primary uppercase tracking-wide truncate">
                  {userRole?.replace('_', ' ') || 'Aluno'}
                </span>
              </div>
            )}

            <button
              onClick={async () => {
                try { await supabaseClient.auth.signOut({ scope: 'local' }); } catch {}
                localStorage.clear();
                window.location.href = '/login';
              }}
              className={`w-full h-9 rounded-lg flex items-center gap-2.5 text-text-disabled hover:text-danger hover:bg-danger/10 transition-all group ${isExpanded ? 'px-3 justify-start' : 'justify-center'}`}
              title="Sair"
            >
              <SignOut size={15} className="shrink-0" />
              {isExpanded && (
                <span className="text-[11px] font-semibold tracking-wide">Sair</span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Hamburger button - Mobile Only - DISABLED (using bottom nav instead) */}
      <button
        aria-label="Menu"
        onClick={() => setOpen(true)}
        className="hidden"
      >
        <List size={22} className="text-brand" />
      </button>

      {/* Drawer Overlay - Mobile Only */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-500 ${open ? 'opacity-100 pointer-events-auto backdrop-blur-md' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-black/80" />
      </div>

      {/* Drawer Menu - Mobile Only */}
      <aside className={`fixed left-0 top-0 h-full w-[75%] max-w-[280px] bg-bg-base shadow-[20px_0_60px_rgba(0,0,0,0.4)] z-50 transform transition-transform duration-500 ease-out border-r border-border-subtle ${open ? 'translate-x-0' : '-translate-x-full'} lg:hidden`}>
        <div className="p-6 pb-4 flex items-center justify-between">
          <div className="w-[66px] h-[66px] rounded-lg flex items-center justify-center overflow-hidden">
            <Image
              src="/LOGO-AURON.webp"
              alt="Auronfit"
              width={54}
              height={54}
              className="object-contain w-[54px] h-[54px]"
              priority
            />
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-10 h-10 flex items-center justify-center bg-surface-1 text-text-secondary hover:text-brand rounded-lg transition-all"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 mt-3 mb-6">
           <div className="p-4 bg-surface-1 rounded-lg border border-border-subtle flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center border border-border-subtle">
                 <User size={15} className="text-brand" />
              </div>
              <div className="flex flex-col">
                 <span className="text-[8px] text-text-disabled uppercase tracking-widest leading-none mb-1">Acesso</span>
                 <span className="text-[9px] text-text-primary uppercase tracking-wide">
                    {userRole?.replace('_', ' ') || 'Carregando...'}
                 </span>
              </div>
           </div>
        </div>

        <nav className="px-4 flex flex-col gap-1.5 overflow-y-auto max-h-[60vh]">
          {flatMobileItems.map((m) => renderNavLink(m, { mobile: true, onNavigate: () => setOpen(false) }))}
        </nav>

        <div className="absolute bottom-8 left-0 right-0 px-5">
            <button
              onClick={async () => {
                await supabaseClient.auth.signOut();
                window.location.href = '/login';
              }}
              className="w-full h-12 bg-danger text-white rounded-lg flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest hover:bg-danger/80 transition-all active:scale-95 shadow-lg shadow-danger/20"
            >
              <SignOut size={16} />
              Sair
            </button>
        </div>
      </aside>
    </>
  );
}
