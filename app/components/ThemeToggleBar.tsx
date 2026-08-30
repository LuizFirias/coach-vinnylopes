'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import ThemeToggle from './ThemeToggle';

// Dark desativado no desktop por enquanto — o toggle (só existia aqui,
// flutuante, desktop-only) fica escondido pra não oferecer uma opção que
// não muda nada na tela. Lógica/componente intactos — troque pra `true`
// pra reativar quando for a hora.
const DESKTOP_DARK_TOGGLE_ENABLED = false;

export default function ThemeToggleBar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (
    !DESKTOP_DARK_TOGGLE_ENABLED ||
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
    loading ||
    !user
  ) {
    return null;
  }

  return (
    <div
      className="hidden lg:block fixed z-70 pointer-events-none"
      style={{
        bottom: 'max(20px, env(safe-area-inset-bottom, 0px))',
        right: 'max(20px, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="pointer-events-auto rounded-full shadow-elev-2 ring-1 ring-border-subtle/80">
        <ThemeToggle />
      </div>
    </div>
  );
}
