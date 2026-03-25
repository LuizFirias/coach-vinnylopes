import { useEffect, useState } from 'react';
import { supabaseClient } from './supabaseClient';
import { isAuthError, handleAuthError } from './authErrorHandler';
import type { User } from '@supabase/supabase-js';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

        if (sessionError) {
          // Handle refresh token errors specifically
          if (isAuthError(sessionError)) {
            console.warn('Session expired or invalid, clearing auth state');
            await supabaseClient.auth.signOut({ scope: 'local' });
            handleAuthError(sessionError);
            setUser(null);
            setError(null); // Don't show error to user, just redirect
            return;
          }
          throw sessionError;
        }

        setUser(session?.user || null);
      } catch (err: any) {
        console.error('Auth initialization error:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        // Handle various auth events
        if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.clear();
        } else if (event === 'TOKEN_REFRESHED' && !session) {
          // Token refresh failed
          console.warn('Token refresh failed, signing out');
          await supabaseClient.auth.signOut({ scope: 'local' });
          setUser(null);
          localStorage.clear();
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        } else {
          setUser(session?.user || null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { user, loading, error };
};
