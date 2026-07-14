import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
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

function isPublicAuthPath(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/signup') ||
    pathname === '/reset-password'
  );
}

// Global error handler for auth errors
if (typeof window !== 'undefined') {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' && !isPublicAuthPath(window.location.pathname)) {
      if (!navigator.onLine) return;
      localStorage.removeItem('sb-auth-token');
      window.location.href = '/login';
    }

    if (event === 'TOKEN_REFRESHED' && !session) {
      if (isPublicAuthPath(window.location.pathname)) return;
      localStorage.removeItem('sb-auth-token');
      window.location.href = '/login';
    }
  });
}
