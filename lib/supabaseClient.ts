import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
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
  // Ao voltar de segundo plano (troca de app no PWA), o Supabase tenta renovar o
  // token sozinho — às vezes emite SIGNED_OUT de forma transitória antes desse
  // refresh terminar (rede ainda reconectando). Em vez de deslogar na hora,
  // espera um instante e confirma se a sessão realmente sumiu antes de redirecionar.
  let signOutTimer: ReturnType<typeof setTimeout> | null = null;

  const cancelPendingSignOut = () => {
    if (signOutTimer) {
      clearTimeout(signOutTimer);
      signOutTimer = null;
    }
  };

  supabaseClient.auth.onAuthStateChange((event, session) => {
    // Log auth events para debug
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Auth] Event: ${event}`, session ? 'Session valid' : 'No session');
    }

    if (event === 'SIGNED_OUT' && !isPublicAuthPath(window.location.pathname)) {
      if (!navigator.onLine) return;
      cancelPendingSignOut();
      signOutTimer = setTimeout(async () => {
        signOutTimer = null;
        const { data } = await supabaseClient.auth.getSession();
        if (!data.session) {
          window.location.href = '/login';
        }
      }, 1500);
      return;
    }

    // Handle token refresh errors
    if (event === 'TOKEN_REFRESHED' && !session) {
      // Evita logout forçado em falhas transitórias de rede.
      console.warn('[Auth] Token refresh sem sessão (possível falha transitória de rede).');
      return;
    }

    // Sessão confirmada (login ou refresh com sucesso) — cancela o logout pendente
    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
      cancelPendingSignOut();
    }
  });
}
