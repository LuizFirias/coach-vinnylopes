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

// ── Student nav — Início no centro ────────────────────────────────────────────
const STUDENT_ITEMS = [
  { href: '/aluno/treinos',         label: 'Treinos',  icon: AuronLinkIcon },
  { href: '/aluno/cardio',          label: 'Cardio',   icon: HeartStraight },
  { href: '/aluno/dashboard',       label: 'Início',   icon: AuronAIcon    },
  { href: '/aluno/plano-alimentar', label: 'Nutrição', icon: ForkKnife     },
  { href: '/aluno/perfil',          label: 'Perfil',   icon: User          },
] as const;

// ── Coach nav (4 items + FAB) ─────────────────────────────────────────────────
const COACH_LEFT = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: AuronAIcon },
  { href: '/admin/alunos',    label: 'Alunos',    icon: Users },
];
const COACH_RIGHT = [
  { href: '/admin/treinos',    label: 'Treinos',    icon: Barbell },
  { href: '/admin/relatorios', label: 'Financeiro', icon: ChartBar  },
];

/** Offset do ícone elevado: sobe um pouco no notch, sem sair da tela. */
const ELEVATED_BOTTOM = -16;

const NAV_SHELL: CSSProperties = {
  position: 'fixed',
  left: 16,
  right: 16,
  bottom: 0,
  zIndex: 50,
  paddingBottom: 'max(10px, env(safe-area-inset-bottom, 0px))',
  pointerEvents: 'none',
};

export default function BottomNav() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { userRole, loading } = useAuth();
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
    pathname === '/aluno/trocar-senha' ||
    pathname === '/admin/trocar-senha' ||
    pathname === '/aluno/onboarding' ||
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
        <div className="pointer-events-auto relative h-13 overflow-visible">
          <svg
            className="absolute inset-0 w-full h-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{ filter: 'drop-shadow(var(--nav-shadow))' }}
          >
            <path
              d="
                M 8,0
                L 30,0
                C 36,0 38,12 50,14
                C 62,12 64,0 70,0
                L 92,0
                A 8 50 0 0 1 100 50
                A 8 50 0 0 1 92 100
                L 8,100
                A 8 50 0 0 1 0 50
                A 8 50 0 0 1 8 0
                Z
              "
              fill="var(--nav-bg)"
              fillOpacity="1"
            />
          </svg>
          <ul className="relative flex items-center justify-around h-full px-2 overflow-visible">
            {STUDENT_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href) ||
                (href === '/aluno/perfil' && (
                  pathname.startsWith('/aluno/estatisticas') ||
                  pathname.startsWith('/aluno/medidas') ||
                  pathname.startsWith('/aluno/fotos') ||
                  pathname.startsWith('/aluno/ranking')
                ));
              const isHome = href === '/aluno/dashboard';

              if (isHome) {
                return (
                  <li
                    key={href}
                    className="relative flex flex-1 items-center justify-center"
                  >
                    <Link
                      href={href}
                      className={cn(
                        'absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-0.5 transition-colors duration-fast',
                        isActive ? 'text-brand' : 'text-text-tertiary',
                      )}
                      style={{ bottom: ELEVATED_BOTTOM }}
                      aria-current={isActive ? 'page' : undefined}
                      aria-label="Início"
                    >
                      <AuronAIcon
                        size={40}
                        active={isActive}
                        className={cn(
                          'transition-transform duration-fast',
                          isActive && 'scale-105',
                        )}
                        style={{
                          filter: isActive
                            ? 'drop-shadow(0 2px 8px rgba(117, 27, 180,0.55))'
                            : 'none',
                        }}
                      />
                      <span
                        className={cn(
                          'text-[9px]',
                          isActive ? 'font-semibold text-brand' : 'font-medium text-text-tertiary',
                        )}
                      >
                        {label}
                      </span>
                    </Link>
                  </li>
                );
              }

              return (
                <li key={href} className="flex flex-1 items-center justify-center">
                  <Link
                    href={href}
                    className={cn(
                      'flex w-full flex-col items-center justify-center gap-0.5 transition-colors duration-fast',
                      isActive ? 'text-brand' : 'text-text-tertiary',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      className={cn(
                        'transition-transform duration-fast',
                        href === '/aluno/treinos' ? 'w-[22px] h-[22px]' : 'w-[18px] h-[18px]',
                        isActive && 'scale-110',
                      )}
                      weight={isActive ? 'fill' : 'regular'}
                      {...(Icon === AuronLinkIcon ? { active: isActive } : {})}
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
            className="w-full max-w-[200px] min-w-[148px] mb-24 px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-surface-1 rounded-2xl overflow-hidden shadow-elev-3">
              {actions.map(({ href, label, icon: Icon }) => (
                <button
                  key={href}
                  type="button"
                  onClick={() => {
                    setFabOpen(false);
                    router.push(href);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left bg-transparent border-0 transition-colors active:bg-surface-2 cursor-pointer"
                >
                  <Icon size={18} weight="regular" className="shrink-0 text-brand" />
                  <span className="text-[12px] font-medium text-text-primary truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav style={NAV_SHELL} aria-label="Navegação coach" className="lg:hidden">
        <div className="pointer-events-auto relative h-13 overflow-visible">
          <svg
            className="absolute inset-0 w-full h-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{ filter: 'drop-shadow(var(--nav-shadow))' }}
          >
            <path
              d="
                M 8,0
                L 30,0
                C 36,0 38,12 50,14
                C 62,12 64,0 70,0
                L 92,0
                A 8 50 0 0 1 100 50
                A 8 50 0 0 1 92 100
                L 8,100
                A 8 50 0 0 1 0 50
                A 8 50 0 0 1 8 0
                Z
              "
              fill="var(--nav-bg)"
              fillOpacity="1"
            />
          </svg>

          <ul className="relative flex items-center justify-around h-full px-2 overflow-visible">
            {COACH_LEFT.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              const isHome = href === '/admin/dashboard';
              return (
                <li key={href} className="flex flex-1 items-center justify-center">
                  <Link
                    href={href}
                    className={cn(
                      'flex flex-col items-center justify-center gap-0.5 transition-colors duration-fast w-full',
                      isActive ? 'text-brand' : 'text-text-tertiary',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      className={cn(
                        'transition-transform duration-fast',
                        isHome ? 'w-[22px] h-[22px]' : 'w-[18px] h-[18px]',
                        isActive && 'scale-110',
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

            <li className="relative flex flex-1 items-center justify-center">
              <button
                type="button"
                onClick={() => setFabOpen((v) => !v)}
                className={cn(
                  'absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-0.5 transition-colors duration-fast',
                  fabOpen ? 'text-brand' : 'text-text-tertiary',
                )}
                style={{ bottom: ELEVATED_BOTTOM }}
                aria-label={fabOpen ? 'Fechar menu' : 'Mais seções'}
              >
                {fabOpen ? (
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-text-on-brand shadow-glow-brand"
                  >
                    <X size={20} weight="bold" />
                  </span>
                ) : (
                  <span
                    className="transition-transform duration-fast"
                    style={{
                      filter: 'drop-shadow(0 2px 8px rgba(117, 27, 180,0.55))',
                    }}
                  >
                    <AuronLinkIcon size={40} active />
                  </span>
                )}
                <span
                  className={cn(
                    'text-[9px]',
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
                      'flex flex-col items-center justify-center gap-0.5 transition-colors duration-fast w-full',
                      isActive ? 'text-brand' : 'text-text-tertiary',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      className={cn(
                        'transition-transform duration-fast',
                        isTreinos ? 'w-[22px] h-[22px]' : 'w-[18px] h-[18px]',
                        isActive && 'scale-110',
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
