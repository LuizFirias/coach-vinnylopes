import { useEffect, useState } from 'react';
import { supabaseClient } from './supabaseClient';
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
          throw sessionError;
        }

        setUser(session?.user || null);
      } catch (err: any) {
        // If refresh token is invalid, clear local storage and sign out
        if (err.message?.includes('Refresh Token') || err.status === 401) {
          try {
            await supabaseClient.auth.signOut();
            localStorage.removeItem('sb-auth-token');
          } catch (e) {
            console.warn('Failed to sign out:', e);
          }
        }
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
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return { user, loading, error };
};
