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

function readCachedRole(userId?: string | null): string | null {
  if (typeof window === 'undefined') return null;
  const cachedId = localStorage.getItem('user_id');
  const cachedRole = localStorage.getItem('user_role');
  if (!cachedRole) return null;
  if (userId && cachedId && cachedId !== userId) return null;
  if (!userId && !cachedId) return null;
  return cachedRole;
}

/**
 * AuthProvider - autenticação + role com cache e dedupe de fetches.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(() => readCachedRole());
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const roleCacheRef = useRef<{ userId: string; role: string } | null>(null);
  const roleInflightRef = useRef<{ userId: string; promise: Promise<string | null> } | null>(null);
  const resolvedUserIdRef = useRef<string | null>(null);

  const applyRole = useCallback((userId: string, role: string) => {
    roleCacheRef.current = { userId, role };
    resolvedUserIdRef.current = userId;
    try {
      localStorage.setItem('user_role', role);
      localStorage.setItem('user_id', userId);
    } catch {
      // ignore
    }
    if (mountedRef.current) setUserRole(role);
  }, []);

  const fetchRoleFromDatabase = useCallback(async (userId: string): Promise<string | null> => {
    if (roleCacheRef.current?.userId === userId) {
      return roleCacheRef.current.role;
    }

    if (roleInflightRef.current?.userId === userId) {
      return roleInflightRef.current.promise;
    }

    const promise = (async () => {
      try {
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (error || !data?.role) {
          if (error) console.error('[AuthProvider] Erro ao buscar role:', error);
          return null;
        }

        roleCacheRef.current = { userId, role: data.role };
        return data.role;
      } catch (err) {
        console.error('[AuthProvider] Exceção ao buscar role:', err);
        return null;
      } finally {
        if (roleInflightRef.current?.userId === userId) {
          roleInflightRef.current = null;
        }
      }
    })();

    roleInflightRef.current = { userId, promise };
    return promise;
  }, []);

  const refreshRole = useCallback(async () => {
    try {
      const { data: { user: currentUser } } = await supabaseClient.auth.getUser();

      if (!currentUser) {
        setUser(null);
        setUserRole(null);
        resolvedUserIdRef.current = null;
        roleCacheRef.current = null;
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_id');
        return;
      }

      setUser(currentUser);
      // força revalidação
      roleCacheRef.current = null;
      const roleFromDb = await fetchRoleFromDatabase(currentUser.id);
      if (roleFromDb) applyRole(currentUser.id, roleFromDb);
    } catch (err) {
      console.error('[AuthProvider] Erro no refresh:', err);
    }
  }, [applyRole, fetchRoleFromDatabase]);

  useEffect(() => {
    mountedRef.current = true;

    const hydrateFromSession = async (sessionUser: User) => {
      setUser(sessionUser);

      const cached = readCachedRole(sessionUser.id);
      if (cached) {
        // Paint rápido com cache — mas sempre revalida no DB (role pode ter mudado no Supabase).
        applyRole(sessionUser.id, cached);
        if (mountedRef.current) setLoading(false);
        roleCacheRef.current = null;
        const roleFromDb = await fetchRoleFromDatabase(sessionUser.id);
        if (!mountedRef.current) return;
        if (roleFromDb && roleFromDb !== cached) {
          applyRole(sessionUser.id, roleFromDb);
        }
        return;
      }

      const roleFromDb = await fetchRoleFromDatabase(sessionUser.id);
      if (!mountedRef.current) return;
      if (roleFromDb) applyRole(sessionUser.id, roleFromDb);
      setLoading(false);
    };

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!mountedRef.current) return;

        if (!session?.user) {
          setUser(null);
          setUserRole(null);
          setLoading(false);
          return;
        }

        await hydrateFromSession(session.user);
      } catch (err) {
        console.error('[AuthProvider] Erro na inicialização:', err);
        if (mountedRef.current) setLoading(false);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    void initializeAuth();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return;

        // INITIAL_SESSION já é coberto pelo getSession() acima — evita fetch duplicado
        if (event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserRole(null);
          resolvedUserIdRef.current = null;
          roleCacheRef.current = null;
          localStorage.removeItem('user_role');
          localStorage.removeItem('user_id');
          setLoading(false);
          return;
        }

        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
          const newUserId = session.user.id;

          // Já resolvido para este user — não busca de novo
          if (resolvedUserIdRef.current === newUserId && roleCacheRef.current?.userId === newUserId) {
            setUser(session.user);
            setLoading(false);
            return;
          }

          setUser(session.user);

          const cached = readCachedRole(newUserId);
          if (cached) {
            applyRole(newUserId, cached);
            setLoading(false);
            roleCacheRef.current = null;
            void fetchRoleFromDatabase(newUserId).then((roleFromDb) => {
              if (!mountedRef.current || !roleFromDb) return;
              if (roleFromDb !== cached) applyRole(newUserId, roleFromDb);
            });
            return;
          }

          void fetchRoleFromDatabase(newUserId).then((roleFromDb) => {
            if (!mountedRef.current || !roleFromDb) return;
            applyRole(newUserId, roleFromDb);
            setLoading(false);
          });
          return;
        }

        // TOKEN_REFRESHED: silencioso
      },
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [applyRole, fetchRoleFromDatabase]);

  const value = {
    user,
    userRole,
    loading,
    refreshRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
