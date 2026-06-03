'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Dumbbell, Utensils, TrendingUp, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const NAV_ITEMS = [
  { href: '/aluno/dashboard', label: 'Início',    icon: Home },
  { href: '/aluno/treinos',   label: 'Treinos',   icon: Dumbbell },
  { href: '/aluno/plano-alimentar', label: 'Nutrição', icon: Utensils },
  { href: '/aluno/medidas',   label: 'Progresso', icon: TrendingUp },
  { href: '/aluno/ranking',   label: 'Ranking',   icon: Trophy },
  { href: '/aluno/perfil',    label: 'Perfil',    icon: User },
] as const;

export function BottomNavNew() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-surface-0 border-t border-border-subtle',
        'pb-[env(safe-area-inset-bottom)]'
      )}
      aria-label="Navegação principal"
    >
      <ul className="flex items-stretch justify-around h-16 max-w-mobile mx-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 h-full',
                  'transition-colors duration-fast ease-out',
                  isActive ? 'text-brand' : 'text-text-tertiary'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className="w-6 h-6"
                  strokeWidth={isActive ? 2.25 : 1.75}
                />
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
