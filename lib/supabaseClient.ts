import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-application-name': 'auronfit-pwa',
    },
  },
});

// Global error handler for auth errors
if (typeof window !== 'undefined') {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    // Log auth events para debug
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Auth] Event: ${event}`, session ? 'Session valid' : 'No session');
    }

    // If session is null and we're not on login page, redirect
    // Guard against network-error-triggered SIGNED_OUT (token refresh fails when offline)
    if (event === 'SIGNED_OUT' && !window.location.pathname.includes('/login')) {
      if (!navigator.onLine) return;
      localStorage.removeItem('sb-auth-token');
      window.location.href = '/login';
    }
    
    // Handle token refresh errors
    if (event === 'TOKEN_REFRESHED' && !session) {
      console.warn('[Auth] Token refresh failed, redirecting to login');
      localStorage.clear();
      window.location.href = '/login';
    }

    // Log token refresh success
    if (event === 'TOKEN_REFRESHED' && session) {
      console.log('[Auth] ✓ Token refreshed successfully');
    }
  });
}
