'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ForkKnife, User, HeartStraight,
  Users, Chat, Plus, BookOpen, X, Handshake, ChartBar, ShieldWarning,
  AppleLogo, Trophy, List, Link as LinkIcon,
} from '@phosphor-icons/react';
import { useAuth } from './AuthProvider';
import { cn } from '@/lib/utils/cn';
import { useState } from 'react';
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
  { href: '/admin/treinos',    label: 'Treinos',    icon: AuronLinkIcon },
  { href: '/admin/relatorios', label: 'Financeiro', icon: ChartBar  },
];

export default function BottomNav() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { userRole, loading } = useAuth();
  const [fabOpen, setFabOpen] = useState(false);

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
    isWorkoutBuilder
  ) {
    return null;
  }

  const isCoach = userRole === 'coach' || userRole === 'super_admin';

  const profileRoute = userRole === 'super_admin' ? '/super-admin/perfil' : '/admin/perfil';

  const actions = [
    { label: 'Nutrição',   href: '/admin/nutricao',             icon: AppleLogo },
    { label: 'Biblioteca', href: '/admin/biblioteca-exercicios', icon: BookOpen  },
    { label: 'Parceiros',  href: '/admin/parceiros',            icon: Handshake },
    { label: 'Feedbacks',  href: '/admin/feedbacks',            icon: Chat      },
    { label: 'Ranking',    href: '/admin/ranking',              icon: Trophy    },
    { label: 'Perfil',     href: profileRoute,                  icon: User      },
    ...(userRole === 'super_admin' ? [
      { label: 'Master Control', href: '/super-admin', icon: ShieldWarning },
      { label: 'Convites', href: '/super-admin/convites', icon: LinkIcon },
    ] : [])
  ];

  // ── Student ─────────────────────────────────────────────────────────────────
  if (!isCoach) {
    return (
      <nav
        className={cn(
          'fixed left-4 right-4 z-40 lg:hidden',
          'overflow-visible',
          'h-13',
        )}
        style={{ bottom: 'max(12px, env(safe-area-inset-bottom))' }}
        aria-label="Navegação principal"
      >
        {/* Fundo da barra com notch côncavo — cor via --nav-bg (tema) */}
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
            const isTreinos = href === '/aluno/treinos';

            // Ícone elevado no notch (Início / dashboard)
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
                    style={{ bottom: -20 }}
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
                          ? 'drop-shadow(0 2px 8px rgba(147, 51, 234,0.55))'
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
                      isTreinos ? 'w-[22px] h-[22px]' : 'w-[18px] h-[18px]',
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
      </nav>
    );
  }

  // ── Coach ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Quick-action overlay */}
      {fabOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/65 backdrop-blur-sm"
          onClick={() => setFabOpen(false)}
        >
          <div
            className="w-full px-4 pb-[calc(max(12px,env(safe-area-inset-bottom))+76px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-surface-2 border border-border-default rounded-3xl overflow-hidden shadow-elev-3">
              {actions.map(({ label, href, icon: Icon }, i) => (
                <button
                  key={href}
                  onClick={() => { setFabOpen(false); router.push(href); }}
                  className={cn(
                    'w-full flex items-center gap-4 px-5 py-4 text-left transition-colors active:bg-surface-3 cursor-pointer',
                    i < actions.length - 1 && 'border-b border-divider',
                  )}
                >
                  <div className="w-9 h-9 rounded-xl bg-brand-subtle border border-brand-border flex items-center justify-center text-brand shrink-0">
                    <Icon size={18} />
                  </div>
                  <span className="text-sm font-medium text-text-primary">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav
        className={cn(
          'fixed left-4 right-4 z-40 lg:hidden',
          'rounded-[28px]',
          'h-16',
        )}
        style={{
          bottom: 'max(12px, env(safe-area-inset-bottom))',
          background: 'var(--nav-bg)',
          border: '1px solid var(--nav-border)',
          boxShadow: 'var(--nav-shadow)',
          backdropFilter: 'blur(16px)',
        }}
        aria-label="Navegação coach"
      >
        <ul className="flex items-center justify-around h-full px-2">

          {/* Left 2 items */}
          {COACH_LEFT.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            const isHome = href === '/admin/dashboard';
            return (
              <li key={href} className="flex-1 flex items-center justify-center">
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
                  <span className={cn('text-[9px]', isActive ? 'font-semibold text-brand' : 'font-medium')}>{label}</span>
                </Link>
              </li>
            );
          })}

          {/* FAB */}
          <li className="flex items-center justify-center shrink-0 px-2">
            <button
              onClick={() => setFabOpen(v => !v)}
              className={cn(
                'w-12 h-12 rounded-2xl bg-brand shadow-glow-brand flex items-center justify-center text-text-on-brand cursor-pointer',
                'transition-all duration-fast active:scale-90',
              )}
              aria-label={fabOpen ? 'Fechar menu' : 'Mais seções'}
            >
              {fabOpen
                ? <X size={22} weight="bold" />
                : <LinkIcon size={22} weight="bold" />
              }
            </button>
          </li>

          {/* Right 2 items */}
          {COACH_RIGHT.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            const isTreinos = href === '/admin/treinos';
            return (
              <li key={href} className="flex-1 flex items-center justify-center">
                <Link
                  href={href}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 transition-colors duration-fast w-full',
                    isActive ? 'text-brand' : 'text-text-tertiary',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={cn(
                    'transition-transform duration-fast',
                    isTreinos ? 'w-[22px] h-[22px]' : 'w-[18px] h-[18px]',
                    isActive && 'scale-110',
                  )} weight={isActive ? 'fill' : 'regular'} {...(Icon === AuronLinkIcon ? { active: isActive } : {})} />
                  <span className={cn('text-[9px]', isActive ? 'font-semibold text-brand' : 'font-medium')}>{label}</span>
                </Link>
              </li>
            );
          })}

        </ul>
      </nav>
    </>
  );
}
