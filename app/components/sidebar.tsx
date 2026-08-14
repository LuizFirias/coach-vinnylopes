"use client";

import { useState, useEffect, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAuth } from './AuthProvider';
import { cn } from '@/lib/utils/cn';
import { useUnreadFeedbacksCount } from '@/lib/feedbacks/useUnreadFeedbacksCount';
import { AuronLinkIcon } from '@/app/components/ui/Auronlinkicon';
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
  HeartStraight,
  ShieldWarning,
  Gear,
  AppleLogo,
  BookOpen,
  ChatCircle,
  ChartBar,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';

type IconComponent = ComponentType<{
  size?: number | string;
  weight?: 'fill' | 'regular';
  className?: string;
}>;

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

const SIDEBAR_EXPANDED_PX = 180;
const SIDEBAR_COLLAPSED_PX = 54;

/**
 * Ajuste MANUAL da lateralidade do elo (só com sidebar aberto).
 * Unidade: pixels. 0 = elo centralizado no sidebar (igual ao nome).
 * Negativo = esquerda · Positivo = direita.
 */
const ELO_OFFSET_X_PX = 0;

/**
 * Distância do topo até o elo — alinhar à saudação "Olá," do dashboard
 * (conteúdo usa lg:p-10 ≈ 40px). Aumente/diminua para calibrar.
 */
const LOGO_TOP_OFFSET_PX = 50;

/** Balão com “!” — feedbacks do aluno. */
function FeedbackIcon({
  size = 18,
  weight = 'regular',
  className,
}: {
  size?: number | string;
  weight?: 'fill' | 'regular';
  className?: string;
}) {
  const px = typeof size === 'number' ? size : 18;
  return (
    <span
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: px, height: px }}
      aria-hidden
    >
      <ChatCircle size={px} weight={weight} className="absolute inset-0" />
      <span
        className="relative z-[1] font-bold leading-none"
        style={{ fontSize: Math.max(9, Math.round(px * 0.42)), marginTop: -1 }}
      >
        !
      </span>
    </span>
  );
}

const alunoMenuItems: MenuItem[] = [
  { id: 'dashboard', name: 'Dashboard', href: '/aluno/dashboard', icon: SquaresFour },
  { id: 'treinos', name: 'Treinos', href: '/aluno/treinos', icon: Barbell },
  { id: 'cardio', name: 'Cardio', href: '/aluno/cardio', icon: HeartStraight },
  { id: 'plano-alimentar', name: 'Plano Alimentar', href: '/aluno/plano-alimentar', icon: ForkKnife },
  { id: 'chat', name: 'Mensagens', href: '/aluno/chat', icon: ChatCircle },
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
  chat: { id: 'chat', name: 'Mensagens', href: '/admin/chat', icon: ChatCircle },
  feedbacks: { id: 'feedbacks', name: 'Feedbacks', href: '/admin/feedbacks', icon: FeedbackIcon },
  'master-control': { id: 'master-control', name: 'Master Control', href: '/super-admin', icon: ShieldWarning },
  'perfil-master': { id: 'perfil-master', name: 'Perfil Master', href: '/super-admin/perfil', icon: Gear },
};

/** Dashboard fica solto após a logo (sem título de seção). */
const coachMenuGroups: MenuGroup[] = [
  { label: 'Gestão', items: ['alunos', 'treinos', 'nutricao', 'biblioteca'] },
  { label: 'Acompanhamento', items: ['ranking', 'chat', 'feedbacks'] },
  { label: 'Negócio', items: ['financeiro', 'parceiros', 'convites'] },
  { label: 'Sistema', items: ['master-control', 'perfil-master'] },
];

function resolveCoachGroups(isSuperAdmin: boolean): { label: string; items: MenuItem[] }[] {
  const hidden = isSuperAdmin
    ? new Set<string>()
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

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const { userRole, loading, user } = useAuth();
  const pathname = usePathname();
  const { hasUnread: hasUnreadFeedbacks } = useUnreadFeedbacksCount();

  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-expanded');
    const expanded = saved !== 'false';
    setIsExpanded(expanded);
    document.documentElement.style.setProperty(
      '--sidebar-width',
      expanded ? `${SIDEBAR_EXPANDED_PX}px` : `${SIDEBAR_COLLAPSED_PX}px`,
    );
  }, []);

  const toggleSidebar = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    localStorage.setItem('sidebar-expanded', String(next));
    document.documentElement.style.setProperty(
      '--sidebar-width',
      next ? `${SIDEBAR_EXPANDED_PX}px` : `${SIDEBAR_COLLAPSED_PX}px`,
    );
  };

  const collapseTab = (
    <button
      type="button"
      onClick={toggleSidebar}
      className="sidebar-collapse-tab"
      style={{ top: LOGO_TOP_OFFSET_PX + 22 }}
      title={isExpanded ? 'Recolher menu' : 'Expandir menu'}
      aria-label={isExpanded ? 'Recolher menu' : 'Expandir menu'}
    >
      {isExpanded ? (
        <CaretLeft size={12} weight="bold" />
      ) : (
        <CaretRight size={12} weight="bold" />
      )}
    </button>
  );

  if (
    pathname === '/login' ||
    pathname === '/' ||
    pathname?.startsWith('/auth/') ||
    pathname?.startsWith('/signup') ||
    pathname === '/termos' ||
    pathname === '/privacidade' ||
    pathname === '/aluno/trocar-senha' ||
    pathname === '/admin/trocar-senha' ||
    pathname === '/aluno/onboarding' ||
    pathname === '/admin/boas-vindas' ||
    pathname?.startsWith('/admin/preview-aluno') ||
    loading
  ) {
    return null;
  }

  if (!user) {
    return null;
  }

  const isAluno = userRole === 'aluno';
  const isSuperAdmin = userRole === 'super_admin';
  const coachGroups = isAluno ? [] : resolveCoachGroups(isSuperAdmin);
  const coachDashboard = coachItemConfig.dashboard;
  const flatMobileItems = isAluno
    ? alunoMenuItems
    : [coachDashboard, ...coachGroups.flatMap((g) => g.items)];

  const homeHref = isAluno ? '/aluno/dashboard' : '/admin/dashboard';

  const renderNavLink = (m: MenuItem, opts?: { onNavigate?: () => void; mobile?: boolean }) => {
    const Icon = m.icon;
    const isActive = pathname === m.href;
    const showBadge = m.id === 'feedbacks' && hasUnreadFeedbacks;

    if (opts?.mobile) {
      return (
        <Link
          key={m.href}
          href={m.href}
          className={`group flex items-center gap-3 rounded-lg px-3 py-3 text-[10px] uppercase tracking-widest transition-all ${
            isActive
              ? 'bg-brand text-black shadow-lg shadow-brand/20'
              : 'text-text-secondary hover:bg-brand/5 hover:text-brand'
          }`}
          onClick={opts.onNavigate}
        >
          <div
            className={`relative flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition-all ${
              isActive ? 'border-brand/30 bg-brand/20' : 'border-card bg-surface-2'
            }`}
          >
            <Icon size={16} weight={isActive ? 'fill' : 'regular'} />
            {showBadge && (
              <span
                className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand ring-2 ring-surface-1"
                aria-hidden
              />
            )}
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
          'sidebar-nav-link group relative flex h-9 items-center gap-2.5 px-1.5 transition-all',
          isActive
            ? 'sidebar-nav-link--active rounded-l-none rounded-r-lg border-l-2 border-white bg-white/15 font-semibold text-white'
            : 'sidebar-nav-link--idle rounded-lg text-white/85 hover:bg-white/10 hover:text-white',
          isExpanded ? 'justify-start' : 'justify-center',
        )}
      >
        {isActive && !isExpanded && (
          <div className="absolute left-0 h-4 w-1 rounded-r-full bg-brand" />
        )}
        <span className="relative shrink-0">
          <Icon
            size={18}
            weight={isActive ? 'fill' : 'regular'}
            className={cn(!isActive && 'transition-transform group-hover:scale-105')}
          />
          {showBadge && (
            <span
              className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-brand ring-1 ring-black/40"
              aria-hidden
            />
          )}
        </span>

        {isExpanded && (
          <span className="flex-1 truncate text-[12px] font-medium tracking-wide">
            {m.name}
          </span>
        )}

        {!isExpanded && (
          <div
            className="pointer-events-none absolute left-full z-100 ml-4 whitespace-nowrap rounded-lg px-2 py-1 text-[10px] font-medium tracking-wider text-white opacity-0 backdrop-blur-xl transition-all group-hover:opacity-100"
            style={{
              background: '#141414',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            {m.name}
          </div>
        )}
      </Link>
    );
  };

  return (
    <>
      <aside
        style={{
          width: isExpanded ? SIDEBAR_EXPANDED_PX : SIDEBAR_COLLAPSED_PX,
        }}
        className="auron-sidebar fixed left-0 top-0 z-60 hidden h-full min-h-0 flex-col items-stretch overflow-visible border-r px-1.5 pb-2 transition-[width] duration-300 lg:flex"
      >
        {/* Aba “ponta de papel” — fora do fluxo, não empurra logo/nome */}
        {collapseTab}

        {/* Logo + nome centralizados no sidebar */}
        <div
          className="mb-5 flex shrink-0 flex-col items-center px-1"
          style={{ paddingTop: LOGO_TOP_OFFSET_PX }}
        >
          <div
            className="mb-1.5 flex justify-center transition-transform duration-300"
            style={{ transform: `translateX(${ELO_OFFSET_X_PX}px)` }}
          >
            <Link href={homeHref} className="group cursor-pointer">
              <AuronLinkIcon
                size={isExpanded ? 28 : 22}
                className="shrink-0 text-white transition-opacity group-hover:opacity-90"
              />
            </Link>
          </div>

          <div
            className={cn(
              'overflow-hidden transition-all duration-300 ease-out',
              isExpanded
                ? 'max-h-10 translate-y-0 opacity-100'
                : 'max-h-0 -translate-y-1 opacity-0',
            )}
            aria-hidden={!isExpanded}
          >
            <Link href={homeHref} className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-auron-nome.svg"
                alt="Auron"
                width={148}
                height={24}
                className="h-6 w-auto max-w-[148px] object-contain [image-rendering:auto] transition-opacity hover:opacity-90"
                draggable={false}
              />
            </Link>
          </div>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {isAluno ? (
            <div className="flex flex-col gap-1 pt-1">
              {alunoMenuItems.map((m) => renderNavLink(m))}
            </div>
          ) : (
            <>
              {/* Dashboard solto — como “Página inicial” do Nutrium */}
              <div className="mb-3 flex flex-col gap-1 pt-1">
                {renderNavLink(coachDashboard)}
              </div>

              {coachGroups.map((group) => (
                <div key={group.label} className="mb-4 flex flex-col gap-1">
                  {isExpanded && (
                    <div className="sidebar-group-label mb-1.5 truncate px-1.5 text-[9px] font-medium uppercase tracking-[1.4px]">
                      {group.label}
                    </div>
                  )}
                  {group.items.map((m) => renderNavLink(m))}
                </div>
              ))}
            </>
          )}
        </nav>

        <div className="mt-auto shrink-0">
          <div className="flex flex-col gap-1 border-t border-white/15 pb-0.5 pt-2">
            <button
              onClick={async () => {
                try {
                  await supabaseClient.auth.signOut({ scope: 'local' });
                } catch {}
                localStorage.clear();
                window.location.href = '/login';
              }}
              className={`sidebar-logout group flex h-9 w-full items-center gap-2.5 rounded-lg transition-all ${isExpanded ? 'justify-start px-1.5' : 'justify-center'}`}
              title="Sair"
            >
              <SignOut size={18} className="shrink-0" />
              {isExpanded && (
                <span className="text-[12px] font-medium tracking-wide">Sair</span>
              )}
            </button>
          </div>
        </div>
      </aside>

      <button aria-label="Menu" onClick={() => setOpen(true)} className="hidden">
        <List size={22} className="text-brand" />
      </button>

      <div
        className={`fixed inset-0 z-40 transition-all duration-500 ${open ? 'pointer-events-auto opacity-100 backdrop-blur-md' : 'pointer-events-none opacity-0'}`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-black/80" />
      </div>

      <aside
        className={`fixed left-0 top-0 z-50 h-full w-[75%] max-w-[280px] transform border-r border-border-subtle bg-bg-base shadow-[20px_0_60px_rgba(0,0,0,0.4)] transition-transform duration-500 ease-out lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between gap-3 p-6 pb-4">
          <Link
            href={homeHref}
            className="flex min-w-0 items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <AuronLinkIcon size={22} className="shrink-0 text-brand" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-auron-nome-roxo.svg"
              alt="Auron"
              width={148}
              height={24}
              className="h-6 w-auto max-w-[148px] object-contain object-left"
              draggable={false}
            />
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-1 text-text-secondary transition-all hover:text-brand"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mb-6 mt-3 flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto px-4">
          {flatMobileItems.map((m) =>
            renderNavLink(m, { mobile: true, onNavigate: () => setOpen(false) }),
          )}
        </nav>

        <div className="absolute bottom-8 left-0 right-0 px-5">
          <button
            onClick={async () => {
              await supabaseClient.auth.signOut();
              window.location.href = '/login';
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-danger text-[9px] uppercase tracking-widest text-white shadow-lg shadow-danger/20 transition-all hover:bg-danger/80 active:scale-95"
          >
            <SignOut size={16} />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
