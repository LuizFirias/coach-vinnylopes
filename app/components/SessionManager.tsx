'use client';

import { useEffect, useRef } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { usePathname } from 'next/navigation';

/**
 * SessionManager - Gerencia renovação de sessão
 * 
 * O autoRefreshToken do Supabase já cuida da renovação automática.
 * Este componente apenas garante que sessões expiradas redirecionem para login.
 */
export default function SessionManager() {
  const pathname = usePathname();
  const lastRefreshAttempt = useRef<number>(0);

  useEffect(() => {
    // Não executar em rotas públicas
    if (pathname === '/login' || pathname === '/') return;

    // Ao voltar para a aba, apenas verificar se sessão ainda é válida
    // sem forçar refresh (o autoRefreshToken já faz isso)
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;

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
