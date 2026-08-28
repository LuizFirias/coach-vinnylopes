"use client";

import { useState, useEffect, type ComponentType } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAuth } from './AuthProvider';
import { cn } from '@/lib/utils/cn';
import { useUnreadFeedbacksCount } from '@/lib/feedbacks/useUnreadFeedbacksCount';
import { useNaoLidasRealtime } from '@/lib/chat/realtime';
import {
  CalendarBlank,
  Barbell,
  ForkKnife,
  Ruler,
  Camera,
  Handshake,
  Trophy,
  User,
  SignOut,
  Users,
  SquaresFour,
  HeartStraight,
  AppleLogo,
  BookOpen,
  ChatCircle,
  ChartBar,
  CaretLeft,
  CaretRight,
  Power,
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
const SIDEBAR_COLLAPSED_PX = 80;

/**
 * Ajuste MANUAL da lateralidade do elo (só com sidebar aberto).
 * Unidade: pixels. 0 = elo centralizado no sidebar (igual ao nome).
 * Negativo = esquerda · Positivo = direita.
 */
const ELO_OFFSET_X_PX = 0;

/**
 * Distância do topo até o elo — alinhado à altura do topbar (92px),
 * pra o item "Dashboard" nascer perto da linha do card branco.
 */
const LOGO_TOP_OFFSET_PX = 16;

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

/* Convites/Master Control/Perfil Master eram exclusivos do modo multi-coach
   do AURON (super-admin gerenciando vários coaches) — não se aplicam aqui,
   onde só existe um treinador. */
const coachItemConfig: Record<string, MenuItem> = {
  dashboard: { id: 'dashboard', name: 'Dashboard', href: '/admin/dashboard', icon: SquaresFour },
  agenda: { id: 'agenda', name: 'Agenda', href: '/admin/agenda', icon: CalendarBlank },
  alunos: { id: 'alunos', name: 'Atletas', href: '/admin/alunos', icon: Users },
  treinos: { id: 'treinos', name: 'Treinos', href: '/admin/treinos', icon: Barbell },
  nutricao: { id: 'nutricao', name: 'Nutrição', href: '/admin/nutricao', icon: AppleLogo },
  biblioteca: { id: 'biblioteca', name: 'Biblioteca', href: '/admin/biblioteca-exercicios', icon: BookOpen },
  relatorios: { id: 'relatorios', name: 'Relatórios', href: '/admin/relatorios', icon: ChartBar },
  parceiros: { id: 'parceiros', name: 'Parceiros', href: '/admin/parceiros', icon: Handshake },
  ranking: { id: 'ranking', name: 'Ranking', href: '/admin/ranking', icon: Trophy },
  chat: { id: 'chat', name: 'Mensagens', href: '/admin/chat', icon: ChatCircle },
  feedbacks: { id: 'feedbacks', name: 'Feedbacks', href: '/admin/feedbacks', icon: FeedbackIcon },
  perfil: { id: 'perfil', name: 'Perfil', href: '/admin/perfil', icon: User },
};

/** Dashboard fica solto após a logo (sem título de seção). */
const coachMenuGroups: MenuGroup[] = [
  { label: 'Gestão', items: ['alunos', 'treinos', 'nutricao', 'agenda', 'biblioteca'] },
  { label: 'Acompanhamento', items: ['ranking', 'chat', 'feedbacks'] },
  { label: 'Negócio', items: ['relatorios', 'parceiros'] },
  { label: 'Sistema', items: ['perfil'] },
];

function resolveCoachGroups(): { label: string; items: MenuItem[] }[] {
  return coachMenuGroups
    .map((group) => ({
      label: group.label,
      items: group.items
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
  // Só o coach usa isso (bolinha de "não lida" no ícone de Mensagens do
  // drawer mobile) — pra aluno passa null, o hook não dispara nenhuma busca.
  const isAlunoRole = userRole === 'aluno';
  const chatNaoLidas = useNaoLidasRealtime(isAlunoRole ? null : user?.id ?? null, 'coach');

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
      style={{ top: LOGO_TOP_OFFSET_PX + 38 }}
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
  const coachGroups = isAluno ? [] : resolveCoachGroups();
  const coachDashboard = coachItemConfig.dashboard;

  const homeHref = isAluno ? '/aluno/dashboard' : '/admin/dashboard';

  const renderNavLink = (m: MenuItem, opts?: { onNavigate?: () => void; mobile?: boolean }) => {
    const Icon = m.icon;
    // Perfil de um aluno (/admin/aluno/[id]) conta como estando dentro da
    // seção "Alunos" — o link do sidebar continua destacado lá também.
    const isActive =
      pathname === m.href ||
      (m.href === '/admin/alunos' && Boolean(pathname?.startsWith('/admin/aluno/')));
    const showBadge =
      (m.id === 'feedbacks' && hasUnreadFeedbacks) ||
      (m.id === 'chat' && chatNaoLidas > 0);

    if (opts?.mobile) {
      // Mesmo visual do link do sidebar desktop (ícone liso, sem "badge" em
      // caixa, mesma fonte/cor/estado ativo) — só um pouco mais alto pro toque.
      return (
        <Link
          key={m.href}
          href={m.href}
          className={cn(
            'group relative flex h-11 items-center gap-3 px-3 transition-all',
            isActive
              ? 'rounded-l-none rounded-r-lg border-l-2 border-white bg-white/15 font-semibold text-white'
              : 'rounded-lg text-white/85 hover:bg-white/10 hover:text-white',
          )}
          onClick={opts.onNavigate}
        >
          <span className="relative shrink-0">
            <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
            {showBadge && (
              <span
                className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-white ring-1 ring-brand"
                aria-hidden
              />
            )}
          </span>
          <span
            className="flex-1 truncate font-semibold tracking-wide"
            style={{
              fontFamily: 'var(--font-nunito-sans), "Nunito Sans", serif',
              fontFeatureSettings: 'normal',
              fontSize: '14px',
            }}
          >
            {m.name}
          </span>
        </Link>
      );
    }

    return (
      <Link
        key={m.href}
        href={m.href}
        title={!isExpanded ? m.name : undefined}
        className={cn(
          'sidebar-nav-link group relative flex h-10 items-center gap-2.5 px-2.5 transition-all',
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
            size={19}
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
          <span
            className="flex-1 truncate font-semibold tracking-wide"
            style={{
              fontFamily: 'var(--font-nunito-sans), "Nunito Sans", serif',
              fontFeatureSettings: "normal",
              fontSize: "14px",
            }}
          >
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
        className="auron-sidebar fixed left-0 top-0 z-60 hidden h-full min-h-0 flex-col items-stretch overflow-visible border-0 bg-transparent px-3 pb-2 transition-[width] duration-300 lg:flex"
      >
        {/* Aba “ponta de papel” — fora do fluxo, não empurra logo/nome */}
        {collapseTab}

        {/* Logo + nome centralizados no sidebar */}
        <div
          className="mb-3.5 flex shrink-0 flex-col items-center px-1"
          style={{ paddingTop: LOGO_TOP_OFFSET_PX }}
        >
          <div
            className="mb-1.5 flex h-7 items-center justify-center transition-transform duration-300"
            style={{
              // Fechado: desce e ocupa o espaço (reservado) onde fica o nome "COACH VINNY".
              transform: `translate(${ELO_OFFSET_X_PX}px, ${isExpanded ? 0 : 23}px)`,
            }}
          >
            <Link href={homeHref} className="group cursor-pointer">
              <Image
                src="/logo.png"
                alt="Coach Vinny"
                width={isExpanded ? 28 : 22}
                height={isExpanded ? 28 : 22}
                className="sidebar-logo-icon shrink-0 rounded-md object-contain transition-opacity group-hover:opacity-90"
              />
            </Link>
          </div>

          <div
            className={cn(
              // max-h fixo (não colapsa pra 0) — o espaço do nome fica reservado
              // mesmo escondido, assim os itens do menu não sobem ao recolher.
              'max-h-10 overflow-hidden transition-opacity duration-300 ease-out',
              isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none',
            )}
            aria-hidden={!isExpanded}
          >
            <Link href={homeHref} className="flex justify-center">
              <span className="font-black text-[11px] uppercase tracking-caps text-text-primary whitespace-nowrap">
                COACH VINNY
              </span>
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
                <span
                  className="font-semibold tracking-wide"
                  style={{
                    fontFamily: 'var(--font-nunito-sans), "Nunito Sans", serif',
                    fontFeatureSettings: "normal",
                    fontSize: "14px",
                  }}
                >
                  Sair
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Gatilho do menu no mobile — só coach (aluno continua com a barra
          inferior). Ícone liso, sem caixa/contorno (fica fixo em toda tela,
          não pode competir visualmente com o conteúdo da página) — some
          enquanto o drawer está aberto, já que dá pra fechar clicando fora
          ou escolhendo uma seção. */}
      {/* Mesmo estilo do "puxador de papel" (sidebar-collapse-tab) do desktop
          — grudado na borda esquerda da tela, não um botão solto. */}
      {!isAluno && !open && (
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
          className="fixed left-0 z-50 flex w-4 items-center justify-center border-0 bg-brand text-white lg:hidden"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)',
            height: 48,
            borderRadius: '0 8px 8px 0',
            boxShadow: '4px 2px 12px rgba(0,0,0,0.28)',
          }}
        >
          <CaretRight size={13} weight="bold" />
        </button>
      )}

      {/* Fundo sólido ao abrir — sem desfoque, a tela por trás fica nítida. */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/70 transition-opacity duration-300 lg:hidden',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />

      {/* Drawer — mesmo visual do sidebar desktop (cor, fonte, ícones,
          grupos com título) só que como painel deslizante. */}
      <aside
        className={cn(
          'auron-sidebar fixed left-0 top-0 z-50 flex h-full w-[55%] max-w-[196px] flex-col border-0 shadow-[20px_0_60px_rgba(0,0,0,0.4)] transition-transform duration-300 ease-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div
          className="flex shrink-0 items-center px-4 pb-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
        >
          <Link href={homeHref} className="flex min-w-0 items-center gap-2" onClick={() => setOpen(false)}>
            <Image
              src="/logo.png"
              alt="Coach Vinny"
              width={28}
              height={28}
              className="shrink-0 rounded-md object-contain"
            />
            <span className="truncate font-black text-[11px] uppercase tracking-caps text-white">
              COACH VINNY
            </span>
          </Link>
        </div>

        <nav
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
        >
          {isAluno ? (
            alunoMenuItems.map((m) => renderNavLink(m, { mobile: true, onNavigate: () => setOpen(false) }))
          ) : (
            <>
              {renderNavLink(coachDashboard, { mobile: true, onNavigate: () => setOpen(false) })}
              {coachGroups.map((group) => (
                <div key={group.label} className="mt-3 flex flex-col gap-1">
                  <div className="sidebar-group-label mb-0.5 truncate px-3 text-[9px] font-medium uppercase tracking-[1.4px]">
                    {group.label}
                  </div>
                  {group.items.map((m) => renderNavLink(m, { mobile: true, onNavigate: () => setOpen(false) }))}
                </div>
              ))}
              {/* Sair — logo abaixo de Perfil, mesmo visual dos outros itens
                  (sem botão grande/linha separada). */}
              <button
                type="button"
                onClick={async () => {
                  await supabaseClient.auth.signOut();
                  window.location.href = '/login';
                }}
                className="group flex h-11 items-center gap-3 rounded-lg px-3 text-white/85 transition-all hover:bg-white/10 hover:text-white"
              >
                <Power size={20} />
                <span
                  className="flex-1 truncate text-left font-semibold tracking-wide"
                  style={{
                    fontFamily: 'var(--font-nunito-sans), "Nunito Sans", serif',
                    fontFeatureSettings: 'normal',
                    fontSize: '14px',
                  }}
                >
                  Sair
                </span>
              </button>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
