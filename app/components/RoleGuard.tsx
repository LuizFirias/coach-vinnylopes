'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

/**
 * RoleGuard - Proteção de rota baseada em role
 * 
 * Versão simplificada para evitar race conditions
 */
export default function RoleGuard({ children, allowedRoles, redirectTo }: RoleGuardProps) {
  const router = useRouter();
  const { userRole, loading, user } = useAuth();

  useEffect(() => {
    // Aguardar o carregamento completar
    if (loading) return;

    // Se não há usuário, redirecionar para login (mas só uma vez)
    if (!user) {
      console.warn('[RoleGuard] Nenhum usuário autenticado');
      router.push('/login');
      return;
    }

    // Se não há role ainda, aguardar (pode estar carregando)
    if (!userRole) {
      console.warn('[RoleGuard] Role ainda não carregado');
      return;
    }

    // Verificar permissão
    if (!allowedRoles.includes(userRole)) {
      console.error('[RoleGuard] ACESSO NEGADO!');
      console.error(`  Role atual: ${userRole}`);
      console.error(`  Roles permitidos: ${allowedRoles.join(', ')}`);
      
      const targetUrl = redirectTo || getRoleHomePage(userRole);
      console.log(`[RoleGuard] Redirecionando para: ${targetUrl}`);
      router.push(targetUrl);
    } else {
      console.log('[RoleGuard] ✅ Acesso permitido:', userRole);
    }
  }, [user, userRole, loading, allowedRoles, redirectTo, router]);

  // Mostrar loading enquanto verifica
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
          <p className="text-zinc-600 text-sm uppercase tracking-widest">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Se não há usuário ou role, mostrar loading (redirecionamento acontecerá via useEffect)
  if (!user || !userRole) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand/20 border-t-brand rounded-full animate-spin"></div>
          <p className="text-zinc-600 text-sm uppercase tracking-widest">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se passou na verificação, renderizar o conteúdo
  if (allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  // Enquanto redireciona, mostrar loading
  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
        <p className="text-red-500 text-sm uppercase tracking-widest">Redirecionando...</p>
      </div>
    </div>
  );
}

/**
 * Retorna a página inicial de cada role
 */
function getRoleHomePage(role: string): string {
  switch (role) {
    case 'aluno':
      return '/aluno/dashboard';
    case 'coach':
      return '/admin/dashboard';
    case 'super_admin':
      return '/super-admin';
    default:
      return '/login';
  }
}
