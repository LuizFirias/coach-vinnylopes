'use client';

import { useEffect, useRef } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { usePathname } from 'next/navigation';

/**
 * SessionManager - Gerencia renovação proativa de sessão
 * 
 * Previne logout automático ao:
 * - Renovar sessão ao abrir o app
 * - Verificar periodicamente a validade do token
 * - Tentar re-autenticação silenciosa antes da expiração
 */
export default function SessionManager() {
  const pathname = usePathname();
  const lastRefreshAttempt = useRef<number>(0);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Não executar em rotas públicas
    if (pathname === '/login' || pathname === '/') return;

    // Renovação proativa ao montar (quando app abre)
    const refreshSessionOnMount = async () => {
      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
          console.warn('[SessionManager] Erro ao verificar sessão:', error.message);
          return;
        }

        if (!session) {
          console.log('[SessionManager] Nenhuma sessão ativa');
          return;
        }

        // Calcular tempo até expiração
        const expiresAt = session.expires_at;
        if (!expiresAt) return;

        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;
        const hoursUntilExpiry = timeUntilExpiry / 3600;
        const daysUntilExpiry = timeUntilExpiry / 86400;

        console.log(`[SessionManager] Sessão expira em ${daysUntilExpiry.toFixed(1)} dias (${hoursUntilExpiry.toFixed(1)}h)`);

        // Renovação AGRESSIVA: renova sempre que faltar menos de 3 dias
        // Isso mantém o refresh token sempre "fresco" e evita expiração
        if (timeUntilExpiry < 259200) { // 3 dias em segundos
          console.log('[SessionManager] Renovando sessão preventivamente (< 3 dias)...');
          const { error: refreshError } = await supabaseClient.auth.refreshSession();
          
          if (refreshError) {
            console.error('[SessionManager] Falha ao renovar sessão:', refreshError.message);
          } else {
            console.log('[SessionManager] ✓ Sessão renovada com sucesso');
            lastRefreshAttempt.current = Date.now();
          }
        }
      } catch (err) {
        console.error('[SessionManager] Erro inesperado:', err);
      }
    };

    refreshSessionOnMount();

    // Verificação periódica a cada 6 horas (renovação super agressiva)
    refreshIntervalRef.current = setInterval(async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session?.expires_at) return;

        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = session.expires_at - now;

        // Se faltam menos de 2 dias, renova
        if (timeUntilExpiry < 172800) {
          // Evitar múltiplas tentativas em sequência (cooldown de 2 minutos)
          const timeSinceLastAttempt = Date.now() - lastRefreshAttempt.current;
          if (timeSinceLastAttempt < 120000) {
            console.log('[SessionManager] Aguardando cooldown antes de nova tentativa');
            return;
          }

          console.log('[SessionManager] Token próximo da expiração, renovando...');
          const { error } = await supabaseClient.auth.refreshSession();
          
          if (error) {
            console.error('[SessionManager] Erro ao renovar token:', error.message);
            
            // Se falhar e token já expirou, redirecionar
            if (timeUntilExpiry <= 0) {
              console.warn('[SessionManager] Token expirado, redirecionando para login');
              window.location.href = '/login';
            }
          } else {
            console.log('[SessionManager] ✓ Token renovado automaticamente');
          }
          
          lastRefreshAttempt.current = Date.now();
        }
      } catch (err) {
        console.error('[SessionManager] Erro na verificação periódica:', err);
      }
    }, 6 * 60 * 60 * 1000); // 6 horas (renovação agressiva)

    // Renovar ao voltar para a aba (visibilitychange)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[SessionManager] App voltou ao foco, verificando sessão...');
        
        try {
          const { data: { session }, error } = await supabaseClient.auth.getSession();
          
          if (error || !session) {
            console.log('[SessionManager] Sessão inválida, tentando renovar...');
            await supabaseClient.auth.refreshSession();
          }
        } catch (err) {
          console.error('[SessionManager] Erro ao verificar sessão no foco:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname]);

  return null; // Componente invisível
}
