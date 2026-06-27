import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase] NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY não configurados');
  }
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-application-name': 'coach-vinny-pwa',
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

    // If session is null and we are on a protected route, redirect to login
    // Guard against network-error-triggered SIGNED_OUT (token refresh fails when offline)
    const isProtectedRoute = 
      window.location.pathname.startsWith('/aluno') || 
      window.location.pathname.startsWith('/admin') || 
      window.location.pathname.startsWith('/super-admin');

    if (event === 'SIGNED_OUT' && isProtectedRoute) {
      if (!navigator.onLine) return;
      localStorage.removeItem('sb-auth-token');
      window.location.href = '/login';
    }
    
    // Handle token refresh errors
    if (event === 'TOKEN_REFRESHED' && !session) {
      // Evita logout forçado em falhas transitórias de rede.
      console.warn('[Auth] Token refresh sem sessão (possível falha transitória de rede).');
      return;
    }

    // Log token refresh success
    if (event === 'TOKEN_REFRESHED' && session) {
      console.log('[Auth] ✓ Token refreshed successfully');
    }
  });
}
