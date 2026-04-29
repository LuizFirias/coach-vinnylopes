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
        // Get current session with timeout to prevent hanging
        const sessionPromise = supabaseClient.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session request timeout')), 5000)
        );

        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

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
        
        // If it's a network/fetch error, clear session and redirect to login
        if (err.message?.includes('Failed to fetch') || err.message?.includes('timeout')) {
          console.warn('Network error or timeout, clearing session');
          await supabaseClient.auth.signOut({ scope: 'local' });
          setUser(null);
          setError(null);
          
          // Redirect to login if not already there
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          return;
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
