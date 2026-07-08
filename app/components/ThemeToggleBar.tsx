'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import ThemeToggle from './ThemeToggle';

export default function ThemeToggleBar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (
    pathname === '/login' ||
    pathname === '/' ||
    pathname?.startsWith('/signup') ||
    pathname === '/aluno/trocar-senha' ||
    pathname === '/admin/trocar-senha' ||
    pathname === '/aluno/onboarding' ||
    loading ||
    !user
  ) {
    return null;
  }

  return (
    <div
      className="hidden lg:block fixed top-0 right-0 z-70 pointer-events-none lg:right-4"
      style={{
        paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
        paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="pointer-events-auto">
        <ThemeToggle />
      </div>
    </div>
  );
}
