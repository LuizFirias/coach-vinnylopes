'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  loading: boolean;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
  refreshRole: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/**
 * AuthProvider - Gerenciamento centralizado de autenticação e role
 * 
 * Versão otimizada para evitar race conditions e AbortErrors
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initializingRef = useRef(false);

  // Função para buscar role do banco (fonte da verdade)
  const fetchRoleFromDatabase = useCallback(async (userId: string): Promise<string | null> => {
    console.log('[AuthProvider] 🔍 Buscando role do banco para user:', userId);
    
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[AuthProvider] ❌ Erro ao buscar role:', error);
        return null;
      }

      if (!data?.role) {
        console.warn('[AuthProvider] ⚠️ Role não encontrado no banco para user:', userId);
        return null;
      }

      console.log('[AuthProvider] ✅ Role encontrado no banco:', data.role);
      return data.role;
    } catch (err) {
      console.error('[AuthProvider] ❌ Exceção ao buscar role:', err);
      return null;
    }
  }, []);

  // Função para atualizar role (com validação cruzada)
  const refreshRole = useCallback(async () => {
    console.log('[AuthProvider] 🔄 Refresh de role solicitado');
    
    try {
      const { data: { user: currentUser } } = await supabaseClient.auth.getUser();
      
      if (!currentUser) {
        console.log('[AuthProvider] ℹ️ Nenhum usuário autenticado');
        setUser(null);
        setUserRole(null);
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_id');
        return;
      }

      console.log('[AuthProvider] 👤 Usuário autenticado:', currentUser.id);
      setUser(currentUser);

      // Buscar role do banco (fonte da verdade)
      const roleFromDb = await fetchRoleFromDatabase(currentUser.id);
      
      if (roleFromDb) {
        setUserRole(roleFromDb);
        localStorage.setItem('user_role', roleFromDb);
        localStorage.setItem('user_id', currentUser.id);
        console.log('[AuthProvider] ✅ Role atualizado:', roleFromDb);
      }
    } catch (err) {
      console.error('[AuthProvider] ❌ Erro no refresh:', err);
    }
  }, [fetchRoleFromDatabase]);

  // Inicialização: verificar sessão e role UMA VEZ
  useEffect(() => {
    if (initializingRef.current) return;
    
    let mounted = true;
    initializingRef.current = true;

    const initializeAuth = async () => {
      console.log('[AuthProvider] 🚀 Inicializando autenticação...');

      try {
        // 1. Verificar se há sessão ativa
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!mounted) return;

        if (!session?.user) {
          console.log('[AuthProvider] ℹ️ Nenhuma sessão encontrada');
          setUser(null);
          setUserRole(null);
          setLoading(false);
          initializingRef.current = false;
          return;
        }

        console.log('[AuthProvider] 👤 Sessão encontrada para:', session.user.id);

        // 2. Buscar role do banco
        const roleFromDb = await fetchRoleFromDatabase(session.user.id);
        
        if (!mounted) return;

        if (roleFromDb) {
          setUser(session.user);
          setUserRole(roleFromDb);
          localStorage.setItem('user_role', roleFromDb);
          localStorage.setItem('user_id', session.user.id);
          
          console.log('[AuthProvider] ✅ Autenticação inicializada:', {
            userId: session.user.id,
            role: roleFromDb,
            email: session.user.email
          });
        } else {
          console.error('[AuthProvider] ❌ Não foi possível obter role do banco');
          setUserRole(null);
        }
      } catch (err) {
        console.error('[AuthProvider] ❌ Erro na inicialização:', err);
      } finally {
        if (mounted) {
          setLoading(false);
          initializingRef.current = false;
        }
      }
    };

    initializeAuth();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthProvider] 🔔 Auth state changed:', event);
        
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserRole(null);
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_id');
          console.log('[AuthProvider] 👋 Usuário deslogado');
        } else if (event === 'SIGNED_IN' && session?.user) {
          // Apenas atualizar se for um novo login
          const roleFromDb = await fetchRoleFromDatabase(session.user.id);
          if (mounted && roleFromDb) {
            setUser(session.user);
            setUserRole(roleFromDb);
            localStorage.setItem('user_role', roleFromDb);
            localStorage.setItem('user_id', session.user.id);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // APENAS executa uma vez

  const value = {
    user,
    userRole,
    loading,
    refreshRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
