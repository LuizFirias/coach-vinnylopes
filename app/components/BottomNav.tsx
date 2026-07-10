'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  House, Barbell, ForkKnife, User,
  Users, Chat, Plus, BookOpen, X, Handshake, ChartBar, ShieldWarning,
  AppleLogo, Trophy, List, Link as LinkIcon,
} from '@phosphor-icons/react';
import { useAuth } from './AuthProvider';
import { cn } from '@/lib/utils/cn';
import { useState } from 'react';

// ── Student nav (4 tabs — Progresso e Ranking acessados via Início e Perfil) ─
const STUDENT_ITEMS = [
  { href: '/aluno/dashboard',       label: 'Início',   icon: House    },
  { href: '/aluno/treinos',         label: 'Treinos',  icon: Barbell  },
  { href: '/aluno/plano-alimentar', label: 'Nutrição', icon: ForkKnife },
  { href: '/aluno/perfil',          label: 'Perfil',   icon: User     },
] as const;

// ── Coach nav (4 items + FAB) ─────────────────────────────────────────────────
const COACH_LEFT = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: House },
  { href: '/admin/alunos',    label: 'Alunos',    icon: Users },
];
const COACH_RIGHT = [
  { href: '/admin/treinos',    label: 'Treinos',    icon: Barbell  },
  { href: '/admin/relatorios', label: 'Financeiro', icon: ChartBar },
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
          'bg-surface-1/75 backdrop-blur-2xl backdrop-saturate-200',
          'rounded-[28px]',
          'shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)]',
          'border border-white/[0.09]',
          'h-16',
        )}
        style={{ bottom: 'max(12px, env(safe-area-inset-bottom))' }}
        aria-label="Navegação principal"
      >
        <ul className="flex items-center justify-around h-full px-2">
          {STUDENT_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href) ||
              (href === '/aluno/perfil' && (
                pathname.startsWith('/aluno/estatisticas') ||
                pathname.startsWith('/aluno/medidas') ||
                pathname.startsWith('/aluno/fotos') ||
                pathname.startsWith('/aluno/ranking')
              ));
            return (
              <li key={href} className="flex-1 flex items-center justify-center">
                <Link
                  href={href}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 transition-colors duration-fast w-full',
                    isActive ? 'text-[#1C65E8]' : 'text-text-tertiary',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span
                    className={cn(
                      'flex flex-col items-center gap-0.5 px-1 py-0.5 rounded-2xl transition-colors duration-fast',
                      isActive && 'bg-[#1C65E8]/10',
                    )}
                  >
                    <Icon className={cn('w-[18px] h-[18px] transition-transform duration-fast', isActive && 'scale-110')} weight={isActive ? 'fill' : 'regular'} />
                    <span className={cn('text-[9px]', isActive ? 'font-semibold text-[#77ACF3]' : 'font-medium')}>
                      {label}
                    </span>
                  </span>
                  {/* Indicador de aba ativa */}
                  {isActive && (
                    <span className="w-1 h-1 rounded-full mt-0.5 flex-shrink-0" style={{ background: '#1C65E8' }} />
                  )}
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
                    i < actions.length - 1 && 'border-b border-border-subtle',
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
          'bg-surface-1/75 backdrop-blur-2xl backdrop-saturate-200',
          'rounded-[28px]',
          'shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)]',
          'border border-white/[0.09]',
          'h-16',
        )}
        style={{ bottom: 'max(12px, env(safe-area-inset-bottom))' }}
        aria-label="Navegação coach"
      >
        <ul className="flex items-center justify-around h-full px-2">

          {/* Left 2 items */}
          {COACH_LEFT.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
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
                  <span
                    className={cn(
                      'flex flex-col items-center gap-0.5 px-1 py-0.5 rounded-2xl transition-colors duration-fast',
                      isActive && 'bg-brand/10',
                    )}
                  >
                    <Icon className={cn('w-[18px] h-[18px] transition-transform duration-fast', isActive && 'scale-110')} weight={isActive ? 'fill' : 'regular'} />
                    <span className={cn('text-[9px]', isActive ? 'font-semibold' : 'font-medium')}>{label}</span>
                  </span>
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
                  <span
                    className={cn(
                      'flex flex-col items-center gap-0.5 px-1 py-0.5 rounded-2xl transition-colors duration-fast',
                      isActive && 'bg-brand/10',
                    )}
                  >
                    <Icon className={cn('w-[18px] h-[18px] transition-transform duration-fast', isActive && 'scale-110')} weight={isActive ? 'fill' : 'regular'} />
                    <span className={cn('text-[9px]', isActive ? 'font-semibold' : 'font-medium')}>{label}</span>
                  </span>
                </Link>
              </li>
            );
          })}

        </ul>
      </nav>
    </>
  );
}
