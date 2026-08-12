"use client";

import { useState, useEffect, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAuth } from './AuthProvider';
import { cn } from '@/lib/utils/cn';
import { useUnreadFeedbacksCount } from '@/lib/feedbacks/useUnreadFeedbacksCount';
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
  feedbacks: { id: 'feedbacks', name: 'Feedbacks', href: '/admin/feedbacks', icon: ChatCircle },
  'master-control': { id: 'master-control', name: 'Master Control', href: '/super-admin', icon: ShieldWarning },
  'perfil-master': { id: 'perfil-master', name: 'Perfil Master', href: '/super-admin/perfil', icon: Gear },
  perfil: { id: 'perfil', name: 'Perfil', href: '/admin/perfil', icon: User },
};

const coachMenuGroups: MenuGroup[] = [
  { label: 'Visão geral', items: ['dashboard'] },
  { label: 'Alunos', items: ['alunos', 'treinos', 'nutricao', 'biblioteca', 'chat'] },
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
    document.documentElement.style.setProperty('--sidebar-width', expanded ? '155px' : '54px');
  }, []);

  const toggleSidebar = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    localStorage.setItem('sidebar-expanded', String(next));
    document.documentElement.style.setProperty('--sidebar-width', next ? '155px' : '54px');
  };

  const collapseButton = (
    <button
      type="button"
      onClick={toggleSidebar}
      className="sidebar-collapse-btn w-5 h-5 border-0 bg-transparent flex items-center justify-center shrink-0 p-0 opacity-70 hover:opacity-100 transition-opacity"
      title={isExpanded ? 'Recolher menu' : 'Expandir menu'}
    >
      {isExpanded ? <CaretLeft size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
    </button>
  );

  // Ocultar em rotas públicas ou enquanto carrega
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

  const renderNavLink = (m: MenuItem, opts?: { onNavigate?: () => void; mobile?: boolean }) => {
    const Icon = m.icon;
    const isActive = pathname === m.href;
    const showBadge = m.id === 'feedbacks' && hasUnreadFeedbacks;

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
          <div className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all shadow-sm border ${
            isActive ? 'bg-brand/20 border-brand/30' : 'bg-surface-2 border-card'
          }`}>
            <Icon size={16} weight={isActive ? 'fill' : 'regular'} />
            {showBadge && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-brand ring-2 ring-surface-1" aria-hidden />
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
          "sidebar-nav-link flex items-center gap-2 px-1.5 h-8 transition-all group relative",
          isActive
            ? "sidebar-nav-link--active bg-white/15 text-white font-semibold border-l-2 border-white rounded-r-lg rounded-l-none"
            : "sidebar-nav-link--idle text-white/85 hover:text-white hover:bg-white/10 rounded-lg",
          isExpanded ? "justify-start" : "justify-center"
        )}
      >
        {isActive && !isExpanded && <div className="absolute left-0 w-1 h-4 bg-brand rounded-r-full" />}
        <span className="relative shrink-0">
          <Icon size={14} weight={isActive ? 'fill' : 'regular'} className={cn(!isActive && 'group-hover:scale-105 transition-transform')} />
          {showBadge && (
            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-brand ring-1 ring-black/40" aria-hidden />
          )}
        </span>

        {isExpanded && (
          <span className="text-[10px] font-semibold tracking-wide truncate flex-1">
            {m.name}
          </span>
        )}

        {!isExpanded && (
          <div
            className="absolute left-full ml-4 px-2 py-1 backdrop-blur-xl text-white text-[10px] font-medium tracking-wider rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-100"
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
      {/* Sidebar for Desktop */}
      <aside
        style={{
          width: isExpanded ? '155px' : '54px',
        }}
        className="auron-sidebar hidden lg:flex fixed left-0 top-0 h-full min-h-0 border-r flex-col py-2 px-1.5 items-stretch z-60 transition-[width] duration-300 overflow-hidden"
      >
        {isExpanded ? (
          <div className="flex items-center justify-center mb-3 shrink-0 px-1">
            <Link
              href={isAluno ? '/aluno/dashboard' : '/admin/dashboard'}
              className="flex items-center justify-center group cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-auron-nome.svg"
                alt="Auron"
                width={100}
                height={11}
                className="h-[25px] w-auto max-w-[112px] object-contain group-hover:opacity-90 transition-opacity"
              />
            </Link>
          </div>
        ) : null}

        <nav className="flex flex-col flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {isAluno ? (
            <div className="flex flex-col gap-0.5">
              <div className={cn(
                'flex items-center mb-1.5 px-1',
                isExpanded ? 'justify-end' : 'justify-center'
              )}>
                {collapseButton}
              </div>
              {alunoMenuItems.map((m) => renderNavLink(m))}
            </div>
          ) : (
            coachGroups.map((group, groupIdx) => (
              <div
                key={group.label}
                className="flex flex-col gap-0.5"
                style={{ marginTop: groupIdx === 0 ? 0 : 16 }}
              >
                {(isExpanded || groupIdx === 0) && (
                  <div
                    className={cn(
                      'flex items-center mb-1.5 px-1 min-h-5',
                      isExpanded ? 'justify-between gap-1' : 'justify-center'
                    )}
                  >
                    {isExpanded && (
                      <div className="sidebar-group-label text-[9px] font-semibold uppercase tracking-[1.2px] truncate">
                        {group.label}
                      </div>
                    )}
                    {groupIdx === 0 && collapseButton}
                  </div>
                )}
                {group.items.map((m) => renderNavLink(m))}
              </div>
            ))
          )}
        </nav>

        <div className="mt-auto shrink-0">
          <div className="pt-2 pb-0.5 flex flex-col gap-1 border-t border-white/15">
            <button
              onClick={async () => {
                try { await supabaseClient.auth.signOut({ scope: 'local' }); } catch {}
                localStorage.clear();
                window.location.href = '/login';
              }}
              className={`sidebar-logout w-full h-8 rounded-lg flex items-center gap-2 transition-all group ${isExpanded ? 'px-1.5 justify-start' : 'justify-center'}`}
              title="Sair"
            >
              <SignOut size={14} className="shrink-0" />
              {isExpanded && (
                <span className="text-[10px] font-semibold tracking-wide">Sair</span>
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
        <div className="p-6 pb-4 flex items-center justify-between gap-3">
          <Link
            href={isAluno ? '/aluno/dashboard' : '/admin/dashboard'}
            className="flex items-center min-w-0"
            onClick={() => setOpen(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-auron-nome.svg"
              alt="Auron"
              width={110}
              height={12}
              className="h-[16px] w-auto max-w-[120px] object-contain object-left"
            />
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="w-10 h-10 shrink-0 flex items-center justify-center bg-surface-1 text-text-secondary hover:text-brand rounded-lg transition-all"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="px-4 mt-3 mb-6 flex flex-col gap-1.5 overflow-y-auto max-h-[60vh]">
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
