'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  House, Barbell, ForkKnife, User,
  Users, Chat, Plus, BookOpen, X, Handshake, ChartBar,
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
  { href: '/admin/alunos',    label: 'Alunos',  icon: Users   },
  { href: '/admin/treinos',   label: 'Treinos', icon: Barbell },
];
const COACH_RIGHT = [
  { href: '/admin/feedbacks', label: 'Feedbacks', icon: Chat },
  { href: '/admin/perfil',    label: 'Perfil',    icon: User       },
];

const QUICK_ACTIONS = [
  { label: 'Dashboard',           href: '/admin/dashboard',                    icon: House     },
  { label: 'Nova Ficha Digital',  href: '/admin/treinos/nova-ficha',           icon: Barbell   },
  { label: 'Plano Alimentar',     href: '/admin/nutricao',                     icon: ForkKnife },
  { label: 'Biblioteca',          href: '/admin/biblioteca-exercicios',        icon: BookOpen  },
  { label: 'Parceiros',           href: '/admin/parceiros',                    icon: Handshake },
  { label: 'Relatórios',          href: '/admin/relatorios',                   icon: ChartBar  },
];

export default function BottomNav() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { userRole, loading } = useAuth();
  const [fabOpen, setFabOpen] = useState(false);

  if (pathname === '/login' || pathname === '/' || loading || pathname.endsWith('/executar')) {
    return null;
  }

  const isCoach = userRole === 'coach' || userRole === 'super_admin';

  // ── Student ─────────────────────────────────────────────────────────────────
  if (!isCoach) {
    return (
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40 lg:hidden',
          'bg-surface-1/95 backdrop-blur-xl border-t border-border-subtle',
          'pb-[env(safe-area-inset-bottom)]',
        )}
        aria-label="Navegação principal"
      >
        <ul className="flex items-stretch justify-around h-16 max-w-mobile mx-auto">
          {STUDENT_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-1 h-full transition-colors duration-fast',
                    isActive ? 'text-brand' : 'text-text-tertiary',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-brand rounded-full" />
                  )}
                  <Icon className={cn('w-5 h-5 transition-transform duration-fast', isActive && 'scale-110')} weight={isActive ? 'fill' : 'regular'} />
                  <span className={cn('text-2xs', isActive ? 'font-semibold' : 'font-medium')}>
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
            className="w-full px-4 pb-[calc(env(safe-area-inset-bottom)+76px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-surface-2 border border-border-default rounded-3xl overflow-hidden shadow-elev-3">
              {QUICK_ACTIONS.map(({ label, href, icon: Icon }, i) => (
                <button
                  key={href}
                  onClick={() => { setFabOpen(false); router.push(href); }}
                  className={cn(
                    'w-full flex items-center gap-4 px-5 py-4 text-left transition-colors active:bg-surface-3',
                    i < QUICK_ACTIONS.length - 1 && 'border-b border-border-subtle',
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
          'fixed bottom-0 left-0 right-0 z-40 lg:hidden',
          'bg-surface-1/95 backdrop-blur-xl border-t border-border-subtle',
          'pb-[env(safe-area-inset-bottom)]',
        )}
        aria-label="Navegação coach"
      >
        <div className="flex items-center justify-around h-16 max-w-mobile mx-auto px-2">

          {/* Left 2 items */}
          {COACH_LEFT.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors duration-fast',
                  isActive ? 'text-brand' : 'text-text-tertiary',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-brand rounded-full" />
                )}
                <Icon className={cn('w-5 h-5 transition-transform duration-fast', isActive && 'scale-110')} weight={isActive ? 'fill' : 'regular'} />
                <span className={cn('text-2xs', isActive ? 'font-semibold' : 'font-medium')}>{label}</span>
              </Link>
            );
          })}

          {/* FAB */}
          <div className="flex items-center justify-center shrink-0 px-3">
            <button
              onClick={() => setFabOpen(v => !v)}
              className={cn(
                'w-12 h-12 rounded-2xl bg-brand shadow-glow-brand flex items-center justify-center text-text-on-brand',
                'transition-all duration-fast active:scale-90',
                fabOpen && 'rotate-45',
              )}
              aria-label={fabOpen ? 'Fechar menu' : 'Ações rápidas'}
            >
              {fabOpen
                ? <X size={22} weight="bold" />
                : <Plus size={22} weight="bold" />
              }
            </button>
          </div>

          {/* Right 2 items */}
          {COACH_RIGHT.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors duration-fast',
                  isActive ? 'text-brand' : 'text-text-tertiary',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-brand rounded-full" />
                )}
                <Icon className={cn('w-5 h-5 transition-transform duration-fast', isActive && 'scale-110')} weight={isActive ? 'fill' : 'regular'} />
                <span className={cn('text-2xs', isActive ? 'font-semibold' : 'font-medium')}>{label}</span>
              </Link>
            );
          })}

        </div>
      </nav>
    </>
  );
}
