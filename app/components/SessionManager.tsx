'use client';

import { useEffect, useRef } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { usePathname } from 'next/navigation';

/**
 * SessionManager - Gerencia renovação de sessão
 *
 * O autoRefreshToken do Supabase já cuida da renovação automática.
 * Este componente apenas garante que sessões expiradas redirecionem para login,
 * exceto durante treinos ativos (para não interromper execução em background).
 */
export default function SessionManager() {
  const pathname = usePathname();
  const lastRefreshAttempt = useRef<number>(0);

  useEffect(() => {
    // Não executar em rotas públicas, de cadastro ou de reset de senha
    if (
      pathname === '/login' || 
      pathname === '/' || 
      pathname === '/reset-password' || 
      pathname?.startsWith('/signup') ||
      pathname?.startsWith('/auth/')
    ) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;

      // Não redirecionar se há treino ativo em andamento
      const hasActiveTreino = Object.keys(localStorage).some(k => k.startsWith('treino_ativo_'));
      if (hasActiveTreino) return;

      // Cooldown de 5 minutos entre verificações
      const timeSinceLastAttempt = Date.now() - lastRefreshAttempt.current;
      if (timeSinceLastAttempt < 5 * 60 * 1000) return;

      lastRefreshAttempt.current = Date.now();

      try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session) {
          console.warn('[SessionManager] Sessão expirada, redirecionando para login...');
          window.location.href = '/login';
        }
      } catch (err) {
        console.error('[SessionManager] Erro ao verificar sessão:', err);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname]);

  return null;
}
