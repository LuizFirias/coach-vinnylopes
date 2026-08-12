'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ForkKnife, User, HeartStraight, Barbell,
  Users, Chat, ChatCircle, BookOpen, X, Handshake, ChartBar, ShieldWarning,
  AppleLogo, Trophy, Link as LinkIcon,
} from '@phosphor-icons/react';
import { useAuth } from './AuthProvider';
import { cn } from '@/lib/utils/cn';
import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AuronLinkIcon } from '@/app/components/ui/Auronlinkicon';
import { AuronAIcon } from '@/app/components/ui/auronAIcon';
import { useUnreadFeedbacksCount } from '@/lib/feedbacks/useUnreadFeedbacksCount';

// ── Student nav — Início no centro ────────────────────────────────────────────
const STUDENT_ITEMS = [
  { href: '/aluno/treinos',         label: 'Treinos',  icon: AuronLinkIcon },
  { href: '/aluno/cardio',          label: 'Cardio',   icon: HeartStraight },
  { href: '/aluno/dashboard',       label: 'Início',   icon: AuronAIcon    },
  { href: '/aluno/plano-alimentar', label: 'Nutrição', icon: ForkKnife     },
  { href: '/aluno/perfil',          label: 'Perfil',   icon: User          },
] as const;

// ── Coach nav (4 items + centro) ──────────────────────────────────────────────
const COACH_LEFT = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: AuronAIcon },
  { href: '/admin/alunos',    label: 'Alunos',    icon: Users },
];
const COACH_RIGHT = [
  { href: '/admin/treinos',    label: 'Treinos',    icon: Barbell },
  { href: '/admin/relatorios', label: 'Financeiro', icon: ChartBar  },
];

/** Barra fixa full-bleed — padrão flat (Wellhub), sem notch/curva. */
const NAV_SHELL: CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 50,
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  pointerEvents: 'none',
};

const NAV_BAR: CSSProperties = {
  background: 'var(--nav-bg)',
  boxShadow: '0 -1px 0 0 var(--border-subtle), 0 -8px 24px rgba(0,0,0,0.06)',
};

export default function BottomNav() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { userRole, loading } = useAuth();
  const { hasUnread: hasUnreadFeedbacks } = useUnreadFeedbacksCount();
  const [fabOpen, setFabOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isWorkoutBuilder =
    pathname?.startsWith('/admin/treinos/nova-ficha') ||
    !!pathname?.match(/\/admin\/aluno\/[^/]+\/ficha\//);

  if (
    pathname === '/login' ||
    pathname === '/' ||
    pathname?.startsWith('/signup') ||
    pathname?.startsWith('/auth/') ||
    pathname === '/termos' ||
    pathname === '/privacidade' ||
    pathname === '/aluno/trocar-senha' ||
    pathname === '/admin/trocar-senha' ||
    pathname === '/aluno/onboarding' ||
    pathname === '/admin/boas-vindas' ||
    pathname?.startsWith('/admin/preview-aluno') ||
    loading ||
    pathname.endsWith('/executar') ||
    !!pathname?.match(/^\/aluno\/chat\/[^/]+$/) ||
    !!pathname?.match(/^\/admin\/chat\/[^/]+$/) ||
    isWorkoutBuilder
  ) {
    return null;
  }

  const isCoach = userRole === 'coach' || userRole === 'super_admin';

  const profileRoute = userRole === 'super_admin' ? '/super-admin/perfil' : '/admin/perfil';

  const actions = [
    { label: 'Mensagens',  href: '/admin/chat',                 icon: ChatCircle },
    { label: 'Nutrição',   href: '/admin/nutricao',             icon: AppleLogo },
    { label: 'Biblioteca', href: '/admin/biblioteca-exercicios', icon: BookOpen  },
    { label: 'Parceiros',  href: '/admin/parceiros',            icon: Handshake },
    { label: 'Feedbacks',  href: '/admin/feedbacks',            icon: Chat      },
    { label: 'Ranking',    href: '/admin/ranking',              icon: Trophy    },
    { label: 'Perfil',     href: profileRoute,                  icon: User      },
    ...(userRole === 'super_admin' ? [
      { label: 'Master Control', href: '/super-admin', icon: ShieldWarning },
      { label: 'Convites', href: '/super-admin/convites', icon: LinkIcon },
    ] : []),
  ];

  // ── Student ─────────────────────────────────────────────────────────────────
  if (!isCoach) {
    const studentNav = (
      <nav style={NAV_SHELL} aria-label="Navegação principal" className="lg:hidden">
        <div className="pointer-events-auto" style={NAV_BAR}>
          <ul className="relative flex items-center justify-around h-14 px-1">
            {STUDENT_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href) ||
                (href === '/aluno/perfil' && (
                  pathname.startsWith('/aluno/estatisticas') ||
                  pathname.startsWith('/aluno/medidas') ||
                  pathname.startsWith('/aluno/fotos') ||
                  pathname.startsWith('/aluno/ranking')
                ));
              const isHome = href === '/aluno/dashboard';

              return (
                <li key={href} className="flex flex-1 items-center justify-center">
                  <Link
                    href={href}
                    className={cn(
                      'flex w-full flex-col items-center justify-center gap-0.5 py-1 transition-colors duration-fast',
                      isActive ? 'text-brand' : 'text-text-tertiary',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={isHome ? 'Início' : label}
                  >
                    <Icon
                      className={cn(
                        'transition-transform duration-fast block leading-none',
                        isHome ? 'w-6 h-6' : href === '/aluno/treinos' ? 'w-[22px] h-[22px]' : 'w-[18px] h-[18px]',
                        isActive && 'scale-105',
                      )}
                      size={isHome ? 24 : undefined}
                      weight={isActive ? 'fill' : 'regular'}
                      {...(Icon === AuronLinkIcon || Icon === AuronAIcon ? { active: isActive } : {})}
                    />
                    <span
                      className={cn(
                        'text-[9px] leading-none',
                        isActive ? 'font-semibold text-brand' : 'font-medium',
                      )}
                    >
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    );

    if (!mounted) return null;
    return createPortal(studentNav, document.body);
  }

  // ── Coach ───────────────────────────────────────────────────────────────────
  const coachNav = (
    <>
      {fabOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px] animate-backdrop-in lg:hidden"
          onClick={() => setFabOpen(false)}
        >
          <div
            className="w-full max-w-[200px] min-w-[148px] mb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-surface-1 rounded-2xl overflow-hidden shadow-elev-3">
              {actions.map(({ href, label, icon: Icon }) => {
                const showFeedbackBadge = href === '/admin/feedbacks' && hasUnreadFeedbacks;
                return (
                  <button
                    key={href}
                    type="button"
                    onClick={() => {
                      setFabOpen(false);
                      router.push(href);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left bg-transparent border-0 transition-colors active:bg-surface-2 cursor-pointer"
                  >
                    <span className="relative shrink-0">
                      <Icon size={18} weight="regular" className="text-brand" />
                      {showFeedbackBadge && (
                        <span
                          className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-brand ring-2 ring-surface-1"
                          aria-hidden
                        />
                      )}
                    </span>
                    <span className="text-[12px] font-medium text-text-primary truncate flex-1">
                      {label}
                    </span>
                    {showFeedbackBadge && (
                      <span className="text-[9px] font-bold text-brand uppercase tracking-wide">
                        Novo
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav style={NAV_SHELL} aria-label="Navegação coach" className="lg:hidden">
        <div className="pointer-events-auto" style={NAV_BAR}>
          <ul className="relative flex items-center justify-around h-14 px-1">
            {COACH_LEFT.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              const isHome = href === '/admin/dashboard';
              return (
                <li key={href} className="flex flex-1 items-center justify-center">
                  <Link
                    href={href}
                    className={cn(
                      'flex flex-col items-center justify-center gap-0.5 py-1 transition-colors duration-fast w-full',
                      isActive ? 'text-brand' : 'text-text-tertiary',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      className={cn(
                        'transition-transform duration-fast',
                        isHome ? 'w-[22px] h-[22px]' : 'w-[18px] h-[18px]',
                        isActive && 'scale-105',
                      )}
                      weight={isActive ? 'fill' : 'regular'}
                      {...(Icon === AuronAIcon ? { active: isActive } : {})}
                    />
                    <span className={cn('text-[9px]', isActive ? 'font-semibold text-brand' : 'font-medium')}>
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}

            <li className="flex flex-1 items-center justify-center">
              <button
                type="button"
                onClick={() => setFabOpen((v) => !v)}
                className={cn(
                  'relative flex w-full flex-col items-center justify-center gap-2 py-1 transition-colors duration-fast border-0 bg-transparent cursor-pointer',
                  fabOpen ? 'text-brand' : 'text-text-tertiary',
                )}
                aria-label={fabOpen ? 'Fechar menu' : 'Mais seções'}
              >
                <span className="relative">
                  {fabOpen ? (
                    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-md bg-brand text-text-on-brand">
                      <X size={12} weight="bold" />
                    </span>
                  ) : (
                    <AuronLinkIcon
                      size={28}
                      active
                      className="block w-7 h-[13px] leading-none"
                    />
                  )}
                  {!fabOpen && hasUnreadFeedbacks && (
                    <span
                      className="absolute -top-1 -right-1.5 h-2 w-2 rounded-full bg-brand ring-2 ring-[var(--nav-bg)]"
                      aria-hidden
                    />
                  )}
                </span>
                <span
                  className={cn(
                    'text-[9px] leading-none',
                    fabOpen ? 'font-semibold text-brand' : 'font-medium text-text-tertiary',
                  )}
                >
                  Mais
                </span>
              </button>
            </li>

            {COACH_RIGHT.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              const isTreinos = href === '/admin/treinos';
              return (
                <li key={href} className="flex flex-1 items-center justify-center">
                  <Link
                    href={href}
                    className={cn(
                      'flex flex-col items-center justify-center gap-0.5 py-1 transition-colors duration-fast w-full',
                      isActive ? 'text-brand' : 'text-text-tertiary',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      className={cn(
                        'transition-transform duration-fast',
                        isTreinos ? 'w-[22px] h-[22px]' : 'w-[18px] h-[18px]',
                        isActive && 'scale-105',
                      )}
                      weight={isActive ? 'fill' : 'regular'}
                    />
                    <span className={cn('text-[9px]', isActive ? 'font-semibold text-brand' : 'font-medium')}>
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );

  if (!mounted) return null;
  return createPortal(coachNav, document.body);
}
