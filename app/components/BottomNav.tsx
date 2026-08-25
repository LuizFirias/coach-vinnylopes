'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ForkKnife, User, HeartStraight } from '@phosphor-icons/react';
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

/**
 * Barra fixa full-bleed — padrão flat (Wellhub), sem notch/curva.
 * O fundo/sombra ficam no shell (não só na barra interna) para que a
 * faixa de safe-area (env(safe-area-inset-bottom)) — que varia por
 * aparelho — seja preenchida com a mesma cor da nav. Sem isso, em
 * dispositivos com inset > 0 (notch/gesto) essa faixa fica transparente
 * e revela o fundo da página, dando a impressão de barra "flutuando"
 * com espaço embaixo.
 */
const NAV_SHELL: CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 50,
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  background: 'var(--nav-bg)',
  boxShadow: '0 -1px 0 0 var(--border-subtle), 0 -8px 24px rgba(0,0,0,0.06)',
};

const NAV_BAR: CSSProperties = {};

/** Navegação inferior — só do aluno. O coach usa o sidebar (drawer no mobile,
 *  fixo no desktop) em vez de barra inferior — ver Sidebar.tsx. */
export default function BottomNav() {
  const pathname  = usePathname();
  const { userRole, loading } = useAuth();
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
  if (isCoach) return null;

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
