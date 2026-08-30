import { supabaseClient } from "@/lib/supabaseClient";

export type OAuthIntent = "login-coach" | "login-aluno" | "signup-coach" | "signup-aluno";

const INTENT_STORAGE_KEY = "coach-vinny-oauth-intent";

export function setOAuthIntent(intent: OAuthIntent) {
  if (typeof window !== "undefined") {
    localStorage.setItem(INTENT_STORAGE_KEY, intent);
  }
}

export function getOAuthIntent(): OAuthIntent | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(INTENT_STORAGE_KEY);
  if (
    value === "login-coach" ||
    value === "login-aluno" ||
    value === "signup-coach" ||
    value === "signup-aluno"
  ) {
    return value;
  }
  return null;
}

export function clearOAuthIntent() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(INTENT_STORAGE_KEY);
  }
}

export async function loginComGoogle(intent: OAuthIntent): Promise<string | null> {
  setOAuthIntent(intent);

  const redirectTo = `${window.location.origin}/auth/callback`;

  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: false,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    clearOAuthIntent();
    return error.message;
  }

  return null;
}
