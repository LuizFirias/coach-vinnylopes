"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { getPostLoginPath, type PostLoginProfile } from "@/lib/auth/getPostLoginPath";
import { clearOAuthIntent, getOAuthIntent } from "@/lib/auth/googleOAuth";

/** Evita double-run do React Strict Mode consumir o code duas vezes. */
let callbackInFlight = false;

function persistSessionCookies(
  accessToken: string,
  refreshToken: string,
  expiresAt?: number | null,
) {
  try {
    localStorage.setItem(
      "sb-auth-token",
      JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
      }),
    );
  } catch {
    // ignore
  }

  // Não bloqueia o redirect — cookies são opcionais
  void fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
    }),
  }).catch(() => {});
}

async function loadProfile(
  userId: string,
  accessToken: string,
): Promise<PostLoginProfile | null> {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("role, must_change_password, first_access_completed, onboarding_visto")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auth/callback] profile error", error);
  }

  if (data) {
    try {
      localStorage.setItem("user_role", data.role || "aluno");
      localStorage.setItem("user_id", userId);
    } catch {
      // ignore
    }
    return data;
  }

  try {
    const res = await fetch("/api/auth/oauth-resolve-profile", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await res.json().catch(() => ({}));
    if (body.profile) {
      try {
        localStorage.setItem("user_role", body.profile.role || "aluno");
        localStorage.setItem("user_id", userId);
      } catch {
        // ignore
      }
      return body.profile as PostLoginProfile;
    }
    if (body.error === "duplicate_account") {
      throw Object.assign(new Error(body.message || "Conta duplicada"), {
        code: "duplicate_account",
        existingRole: body.existingRole,
      });
    }
  } catch (err) {
    if ((err as { code?: string })?.code === "duplicate_account") throw err;
    console.error("[auth/callback] resolve-profile fallback", err);
  }

  return null;
}

function pathForProfile(profile: PostLoginProfile) {
  const intent = getOAuthIntent();
  clearOAuthIntent();

  if (intent === "signup-coach" && (profile.role || "aluno") === "aluno") {
    return "/signup/coach?oauth=1";
  }

  return getPostLoginPath(profile);
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Conectando com Google...");

  useEffect(() => {
    if (callbackInFlight) return;
    callbackInFlight = true;

    const go = (path: string) => {
      // Navegação client-side: evita reload completo (bem mais rápido)
      router.replace(path);
    };

    const finish = async () => {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const oauthError =
        params.get("error_description") ||
        params.get("error") ||
        hashParams.get("error_description") ||
        hashParams.get("error");

      if (oauthError) {
        clearOAuthIntent();
        window.location.replace(`/?tab=aluno&error=${encodeURIComponent(oauthError)}`);
        return;
      }

      const code = params.get("code");
      const accessTokenHash = hashParams.get("access_token");
      const refreshTokenHash = hashParams.get("refresh_token");

      let session = null as Awaited<
        ReturnType<typeof supabaseClient.auth.getSession>
      >["data"]["session"];

      if (code) {
        const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
        if (error || !data.session) {
          console.error("[auth/callback] exchange failed", error);
          clearOAuthIntent();
          window.location.replace(
            `/?tab=aluno&error=${encodeURIComponent(error?.message || "Não foi possível concluir o login com Google.")}`,
          );
          return;
        }
        session = data.session;
      } else if (accessTokenHash && refreshTokenHash) {
        const { data, error } = await supabaseClient.auth.setSession({
          access_token: accessTokenHash,
          refresh_token: refreshTokenHash,
        });
        if (error || !data.session) {
          console.error("[auth/callback] setSession failed", error);
          clearOAuthIntent();
          window.location.replace(
            `/?tab=aluno&error=${encodeURIComponent(error?.message || "Não foi possível concluir o login com Google.")}`,
          );
          return;
        }
        session = data.session;
      } else {
        session = (await supabaseClient.auth.getSession()).data.session;
      }

      if (!session?.user) {
        clearOAuthIntent();
        window.location.replace(
          `/?tab=aluno&error=${encodeURIComponent("Sessão Google não encontrada. Tente novamente.")}`,
        );
        return;
      }

      persistSessionCookies(session.access_token, session.refresh_token, session.expires_at);

      let profile: PostLoginProfile | null;
      try {
        profile = await loadProfile(session.user.id, session.access_token);
      } catch (err) {
        const e = err as { code?: string; message?: string; existingRole?: string };
        if (e.code === "duplicate_account") {
          await supabaseClient.auth.signOut({ scope: "local" });
          const tab =
            e.existingRole === "coach" || e.existingRole === "super_admin" ? "coach" : "aluno";
          window.location.replace(
            `/?tab=${tab}&error=${encodeURIComponent(e.message || "Conta já existente.")}`,
          );
          return;
        }
        throw err;
      }

      if (!profile) {
        clearOAuthIntent();
        window.location.replace(
          `/?tab=aluno&error=${encodeURIComponent("Perfil de acesso não localizado. Entre com e-mail e senha ou contate o suporte.")}`,
        );
        return;
      }

      go(pathForProfile(profile));
    };

    finish()
      .catch((err) => {
        console.error("[auth/callback]", err);
        clearOAuthIntent();
        setMessage("Erro ao processar login. Redirecionando...");
        window.location.replace(
          `/?tab=aluno&error=${encodeURIComponent("Não foi possível concluir o login com Google.")}`,
        );
      })
      .finally(() => {
        callbackInFlight = false;
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center gap-4 px-6">
      <DumbbellLoader variant="inline" />
      <p className="text-sm text-text-secondary text-center">{message}</p>
    </div>
  );
}
