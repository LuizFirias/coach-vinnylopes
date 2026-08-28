"use client";

import React, { useState, useEffect, useRef, FormEvent, ChangeEvent, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  WarningCircle, 
  Eye, 
  EyeSlash, 
  ShieldCheck, 
  ChatCircle, 
  Check
} from "@phosphor-icons/react";
import PWAInstall from "./components/PWAInstall";
import DumbbellLoader from "./components/DumbbellLoader";
import { LoginFloatingCards } from "@/app/components/marketing/LoginFloatingCards";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { getPostLoginPath } from "@/lib/auth/getPostLoginPath";
import { loginComGoogle } from "@/lib/auth/googleOAuth";
import { GoogleSignInButton } from "@/app/components/auth/GoogleSignInButton";
import { AUTH_PILL_CTA, AUTH_UNDERLINE_INPUT } from "@/lib/auth/authFormStyles";

function readStoredRoleTab(tabParam: string | null): "coach" | "aluno" {
  if (tabParam === "aluno" || tabParam === "coach") return tabParam;
  if (typeof window !== "undefined") {
    const savedRoleTab = localStorage.getItem("coach-vinny-login-role-tab");
    if (savedRoleTab === "aluno" || savedRoleTab === "coach") return savedRoleTab;
  }
  return "coach";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<"login" | "register" | "recovery">("login");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const [roleTab, setRoleTab] = useState<"coach" | "aluno">("coach");
  const roleTabRef = useRef<"coach" | "aluno">("coach");
  const sessionCheckedRef = useRef(false);
  const allowAutoRedirectRef = useRef(true);

  // Novas features da especificação de melhorias de login
  const [rememberMe, setRememberMe] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [coachCount, setCoachCount] = useState<number | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const resolveLoginErrorMessage = async (emailAddress: string): Promise<string> => {
    try {
      const res = await fetch("/api/auth/check-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddress }),
      });
      if (res.ok) {
        const { exists } = await res.json();
        if (!exists) return "Nenhuma conta encontrada com este e-mail.";
        return "Senha incorreta. Esqueceu? Use 'Recuperar senha'.";
      }
    } catch {
      // fallback abaixo
    }
    return "Não foi possível entrar. Tente novamente.";
  };

  const handleRoleTabChange = (tab: "coach" | "aluno") => {
    if (roleTabRef.current === tab) return;
    allowAutoRedirectRef.current = false;
    roleTabRef.current = tab;
    setRoleTab(tab);
    setError(null);
    if (typeof window !== "undefined") {
      localStorage.setItem("coach-vinny-login-role-tab", tab);
    }

    void (async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session?.user) return;

        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        const role = profile?.role || "aluno";
        const isCoachAccount = role === "coach" || role === "super_admin";
        const mismatch =
          (tab === "aluno" && isCoachAccount) ||
          (tab === "coach" && !isCoachAccount);

        if (!mismatch) return;

        await supabaseClient.auth.signOut();
        await fetch("/api/session", { method: "DELETE" });
      } catch {
        // sessão já encerrada ou indisponível
      }
    })();
  };

  useEffect(() => {
    const errorParam = searchParams?.get("error");
    const tabParam = searchParams?.get("tab");
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
    const tab = readStoredRoleTab(tabParam);
    roleTabRef.current = tab;
    setRoleTab(tab);
  }, [searchParams]);

  const handleGoogleLogin = async (authMode: "login" | "register" = "login") => {
    setGoogleLoading(true);
    setError(null);
    const isCoach = roleTabRef.current === "coach";
    const intent =
      authMode === "register"
        ? isCoach
          ? "signup-coach"
          : "signup-aluno"
        : isCoach
          ? "login-coach"
          : "login-aluno";
    const err = await loginComGoogle(intent);
    if (err) {
      setError(err);
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (sessionCheckedRef.current) return;
    sessionCheckedRef.current = true;

    // Carregar e-mail salvo se a opção "Lembrar-me" estiver ativada
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("coach-vinny-remember-email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }

    // Se Supabase redirecionar para /login com tokens de recovery, reencaminhar para /reset-password
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const queryParams = new URLSearchParams(window.location.search);
      const code = queryParams.get('code');

      if (hashParams.get('type') === 'recovery' && hashParams.get('access_token')) {
        router.replace(`/reset-password${window.location.hash}`);
        return;
      }
      if (code) {
        router.replace(`/reset-password?code=${code}`);
        return;
      }
    }

    const checkExistingSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.user) return;

      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("role, must_change_password, first_access_completed, onboarding_visto")
        .eq("id", session.user.id)
        .single();

      if (!profile) return;

      if (allowAutoRedirectRef.current) {
        router.replace(getPostLoginPath(profile));
        return;
      }

      const desiredTab = roleTabRef.current;
      const role = profile.role || "aluno";
      const isCoachAccount = role === "coach" || role === "super_admin";

      if (desiredTab === "aluno" && isCoachAccount) {
        await supabaseClient.auth.signOut();
        try {
          await fetch("/api/session", { method: "DELETE" });
        } catch {
          // ignore
        }
        return;
      }

      if (desiredTab === "coach" && !isCoachAccount) {
        await supabaseClient.auth.signOut();
        try {
          await fetch("/api/session", { method: "DELETE" });
        } catch {
          // ignore
        }
        return;
      }

      const { data: { session: freshSession } } = await supabaseClient.auth.getSession();
      if (!freshSession?.user) return;

      router.replace(getPostLoginPath(profile));
    };
    checkExistingSession();

    fetch("/api/public/coach-count")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data?.count === "number") setCoachCount(data.count);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps -- executar apenas na montagem
  }, []);

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); setError(null); };
  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => { setPassword(e.target.value); setError(null); };

  // Medidor de Força da Senha
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length === 0) return 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) score++;
    return score; // 0 a 3
  };


  // Detector de Caps Lock
  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState && e.getModifierState("CapsLock")) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryLoading(true);
    setRecoveryError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      if (!res.ok) throw new Error("Erro ao enviar");
      setRecoverySent(true);
    } catch {
      setRecoveryError("Não foi possível enviar o e-mail. Verifique o endereço.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleSupportClick = () => {
    if (typeof window !== "undefined") window.open("https://wa.me/556781232717", "_blank");
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabaseClient.auth.signInWithPassword({ email, password });

      if (authError) {
        const message = authError.message?.toLowerCase().includes("email not confirmed")
          ? "Confirme seu e-mail antes de entrar."
          : await resolveLoginErrorMessage(email);
        setError(message);
        setLoading(false);
        return;
      }

      if (data?.session && data.user) {
        // Gerenciamento da preferência Lembrar-me
        if (rememberMe) {
          localStorage.setItem("coach-vinny-remember-email", email);
        } else {
          localStorage.removeItem("coach-vinny-remember-email");
        }

        if (typeof window !== "undefined" && data.session.access_token && data.session.refresh_token) {
          try {
            localStorage.setItem("sb-auth-token", JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at,
            }));
          } catch (err) {
            console.warn("Could not store session in localStorage", err);
          }
        }

        const { data: profileData, error: profileError } = await supabaseClient
          .from("profiles")
          .select("id, role, must_change_password, first_access_completed, onboarding_visto")
          .eq("id", data.user.id)
          .single();

        if (profileError || !profileData) {
          setError("Perfil de acesso não localizado.");
          await supabaseClient.auth.signOut();
          setLoading(false);
          return;
        }

        const role = profileData.role || "aluno";
        const isCoachAccount = role === "coach" || role === "super_admin";

        const activeRoleTab = roleTabRef.current;

        if (activeRoleTab === "aluno" && isCoachAccount) {
          setError("Esta conta é de coach. Selecione a aba Coach para entrar.");
          await supabaseClient.auth.signOut();
          setLoading(false);
          return;
        }

        if (activeRoleTab === "coach" && !isCoachAccount) {
          setError("Esta conta é de aluno. Selecione a aba Aluno para entrar.");
          await supabaseClient.auth.signOut();
          setLoading(false);
          return;
        }

        try {
          await fetch("/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at,
            }),
          });
        } catch (err) {
          console.warn("Could not set session cookie", err);
        }

        const from = searchParams?.get("from");

        if (from && !profileData?.must_change_password) {
          const isAlunoRoute = from.startsWith("/aluno");
          const isAdminRoute = from.startsWith("/admin");
          const isSuperAdminRoute = from.startsWith("/super-admin");
          const allowAdmin = isCoachAccount;
          if ((isAlunoRoute && role === "aluno") || ((isAdminRoute || isSuperAdminRoute) && allowAdmin)) {
            router.push(from);
            return;
          }
        }

        router.push(getPostLoginPath(profileData));
      }
    } catch {
      setError("Não foi possível entrar. Tente novamente.");
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError("Informe seu nome completo.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (!termsAccepted) {
      setError("Aceite os Termos de Uso e a Política de Privacidade.");
      return;
    }

    setLoading(true);

    try {
      const isCoach = roleTabRef.current === "coach";
      const endpoint = isCoach ? "/api/auth/signup-coach" : "/api/auth/signup-aluno";
      const inviteCode = searchParams?.get("convite") ?? undefined;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isCoach
            ? {
                email: trimmedEmail,
                password,
                fullName: trimmedName,
                inviteCode,
              }
            : {
                email: trimmedEmail,
                password,
                fullName: trimmedName,
              },
        ),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.error || "Erro ao criar conta. Tente novamente.");
        setLoading(false);
        return;
      }

      await supabaseClient.auth.signOut({ scope: "local" });
      try {
        await fetch("/api/session", { method: "DELETE" });
      } catch {
        // ignore
      }
      localStorage.removeItem("user_role");
      localStorage.removeItem("user_id");

      const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError || !signInData.session || !signInData.user) {
        router.push(`/?email=${encodeURIComponent(trimmedEmail)}&novo=true&tab=${roleTabRef.current}`);
        return;
      }

      if (typeof window !== "undefined" && signInData.session.access_token) {
        try {
          localStorage.setItem(
            "sb-auth-token",
            JSON.stringify({
              access_token: signInData.session.access_token,
              refresh_token: signInData.session.refresh_token,
              expires_at: signInData.session.expires_at,
            }),
          );
        } catch {
          // ignore
        }
      }

      try {
        await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
            expires_at: signInData.session.expires_at,
          }),
        });
      } catch {
        // ignore
      }

      const { data: profileData } = await supabaseClient
        .from("profiles")
        .select("role, must_change_password, first_access_completed, onboarding_visto")
        .eq("id", signInData.user.id)
        .single();

      router.push(profileData ? getPostLoginPath(profileData) : isCoach ? "/admin/boas-vindas" : "/aluno/onboarding");
    } catch {
      setError("Erro inesperado ao criar conta. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-surface-0 flex flex-col lg:flex-row antialiased selection:bg-brand/35 selection:text-white">
      <PWAInstall />

      {/* Glow decorativo - Hidden on mobile to prevent performance lag */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px]"
          style={{ background: 'rgba(117, 27, 180,0.08)' }}
        />
        <div
          className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full blur-[120px]"
          style={{ background: 'rgba(117, 27, 180,0.06)' }}
        />
      </div>

      {/* Lado Esquerdo — mockups transparentes + cards flutuantes (Desktop) */}
      <div
        className="hidden lg:flex lg:w-[50%] lg:min-h-dvh items-center justify-center relative select-none border-r border-black/5 z-20"
        style={{
          background: 'linear-gradient(160deg, #faf5ff 0%, #f5f5f7 60%, #ffffff 100%)',
        }}
      >
        {/* Clip só no hero — cards podem atravessar a linha divisória */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(80% 70% at 40% 30%, rgba(212, 168, 67, 0.12), transparent 70%)',
            }}
          />
        </div>

        <LoginFloatingCards className="absolute inset-0 z-10 w-full h-full overflow-visible" />
      </div>

      {/* Lado Direito - Form Panel */}
      <div
        className="flex flex-1 flex-col items-center justify-center w-full max-w-lg lg:max-w-none mx-auto relative z-10 px-6 py-4 sm:py-6 md:px-12 lg:px-16 lg:min-h-dvh"
        style={{
          background: 'linear-gradient(160deg, #faf5ff 0%, #f5f5f7 60%, #ffffff 100%)',
        }}
      >
        
        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-3 sm:mb-4 lg:mb-5">
          <Image
            src="/logo.png"
            alt="Coach Vinny"
            width={64}
            height={64}
            priority
            className="w-14 lg:w-16 h-auto object-contain rounded-xl drop-shadow-2xl animate-fade-in mb-2"
          />
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-brand w-6 h-6" />
            <h1 className="text-lg lg:text-xl font-bold text-text-primary tracking-widest uppercase font-display">COACH VINNY</h1>
          </div>
        </div>

        {/* Form — estilo Mobills: tabs Entrar/Cadastrar + campos underline */}
        <div className="relative z-20 w-full max-w-[380px] px-6 md:px-7 lg:px-0">
          {mode !== "recovery" && (
            <div
              role="tablist"
              aria-label="Entrar ou cadastrar"
              className="mb-6 flex w-full items-center justify-center gap-10"
            >
              {(
                [
                  { id: "login" as const, label: "Entrar" },
                  { id: "register" as const, label: "Cadastrar" },
                ] as const
              ).map((tab) => {
                const active = mode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setMode(tab.id);
                      setError(null);
                    }}
                    className={cn(
                      "relative pb-2.5 text-[13px] font-bold uppercase tracking-[0.14em] transition-colors",
                      active ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary",
                    )}
                  >
                    {tab.label}
                    {active && (
                      <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-full bg-brand" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {(mode === "login" || mode === "register") && (
            <div
              role="tablist"
              aria-label="Tipo de acesso"
              className="relative z-50 mb-5 flex w-full gap-1 rounded-full p-1"
              style={{ background: "rgba(117, 27, 180,0.08)" }}
            >
              {(["coach", "aluno"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={roleTab === tab}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleRoleTabChange(tab);
                  }}
                  onClick={() => handleRoleTabChange(tab)}
                  className={cn(
                    "relative z-10 min-h-[40px] flex-1 rounded-full px-4 py-2",
                    "text-[11px] font-bold uppercase tracking-widest",
                    "transition-all duration-200 ease-in-out touch-manipulation cursor-pointer select-none",
                    roleTab === tab
                      ? "bg-brand text-white shadow-sm"
                      : "bg-transparent text-text-tertiary hover:text-text-secondary",
                  )}
                >
                  {tab === "coach" ? "Coach" : "Aluno"}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* ── Recuperar senha ── */}
            {mode === "recovery" && (
              <motion.div
                key="recovery"
                initial={false}
                className="space-y-4 relative z-10"
              >
                <div className="text-center mb-1">
                  <p className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Recuperar senha
                  </p>
                  <p className="text-[11px] text-text-secondary leading-relaxed mt-1">
                    Digite seu e-mail e enviaremos um link para criar uma nova senha.
                  </p>
                </div>

                {recoverySent ? (
                  <div className="bg-brand-subtle/50 border border-brand-border text-brand p-3 rounded-lg text-xs font-semibold text-center leading-relaxed">
                    E-mail enviado! Verifique sua caixa de entrada (e pasta de spam se necessário).
                  </div>
                ) : (
                  <form onSubmit={handleRecovery} className="space-y-5">
                    <input
                      id="recoveryEmail"
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => {
                        setRecoveryEmail(e.target.value);
                        setRecoveryError(null);
                      }}
                      placeholder="Seu e-mail"
                      required
                      className={AUTH_UNDERLINE_INPUT}
                    />

                    <AnimatePresence>
                      {recoveryError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-danger/10 border border-danger/20 text-danger px-3 py-2 rounded-lg text-xs flex items-center gap-2 overflow-hidden"
                        >
                          <WarningCircle className="w-4 h-4 flex-shrink-0" />
                          {recoveryError}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={recoveryLoading}
                      className={AUTH_PILL_CTA}
                      style={{
                        background:
                          "linear-gradient(135deg, #c084fc 0%, #751BB4 55%, #7e22ce 100%)",
                        boxShadow: "0 4px 20px rgba(117, 27, 180,0.40)",
                        fontSize: "13px",
                      }}
                    >
                      {recoveryLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        "Enviar link"
                      )}
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setRecoverySent(false);
                    setRecoveryError(null);
                  }}
                  className="w-full text-brand text-sm font-semibold hover:underline transition-colors pt-1"
                >
                  Voltar ao login
                </button>
              </motion.div>
            )}

            {/* ── Cadastrar ── */}
            {mode === "register" && (
              <motion.form
                key="register"
                initial={false}
                onSubmit={handleRegister}
                className="space-y-5 relative z-10"
              >
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-start gap-2 bg-red-500/10 border-l-4 border-red-500 rounded-md p-3 text-sm text-red-400"
                    >
                      <WarningCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <GoogleSignInButton
                  loading={googleLoading}
                  disabled={loading}
                  label="Cadastrar com Google"
                  onClick={() => {
                    void handleGoogleLogin("register");
                  }}
                />

                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.12)" }} />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "#aaa" }}
                  >
                    ou
                  </span>
                  <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.12)" }} />
                </div>

                <input
                  id="register-name"
                  type="text"
                  value={fullName}
                  disabled={loading}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setError(null);
                  }}
                  placeholder="Nome"
                  required
                  autoComplete="name"
                  className={AUTH_UNDERLINE_INPUT}
                />

                <input
                  id="register-email"
                  type="email"
                  value={email}
                  disabled={loading}
                  onChange={handleEmailChange}
                  placeholder="E-mail"
                  required
                  autoComplete="email"
                  className={AUTH_UNDERLINE_INPUT}
                />

                <div className="relative">
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    disabled={loading}
                    onChange={handlePasswordChange}
                    onKeyUp={handlePasswordKeyDown}
                    onKeyDown={handlePasswordKeyDown}
                    placeholder="Senha"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={cn(AUTH_UNDERLINE_INPUT, "pr-9")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors p-1"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeSlash className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {password.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1.5">
                      {[1, 2, 3].map((level) => {
                        const strength = getPasswordStrength(password);
                        return (
                          <div
                            key={level}
                            className={cn(
                              "h-1 flex-1 rounded-full transition-colors",
                              strength >= level
                                ? strength === 1
                                  ? "bg-red-400"
                                  : strength === 2
                                    ? "bg-amber-400"
                                    : "bg-emerald-500"
                                : "bg-black/10",
                            )}
                          />
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-text-tertiary">
                      {getPasswordStrength(password) <= 1
                        ? "Senha fraca — use 8+ caracteres"
                        : getPasswordStrength(password) === 2
                          ? "Senha média"
                          : "Senha forte"}
                    </p>
                  </div>
                )}

                {capsLockActive && (
                  <div className="flex items-center gap-1.5 text-xs text-warning">
                    <WarningCircle className="w-3.5 h-3.5 flex-shrink-0" weight="fill" />
                    <span>Caps Lock está ativado</span>
                  </div>
                )}

                <label
                  htmlFor="termsAccepted"
                  className="relative z-20 flex min-h-[40px] cursor-pointer touch-manipulation select-none items-start gap-2.5"
                >
                  <input
                    id="termsAccepted"
                    type="checkbox"
                    checked={termsAccepted}
                    disabled={loading}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      setError(null);
                    }}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                      termsAccepted ? "bg-brand" : "border-[1.5px] bg-transparent",
                    )}
                    style={!termsAccepted ? { borderColor: "rgba(0,0,0,0.2)" } : undefined}
                  >
                    {termsAccepted && <Check className="h-3 w-3 text-white" weight="bold" />}
                  </span>
                  <span className="text-[12px] leading-relaxed text-text-secondary">
                    Li e concordo com os{" "}
                    <Link href="/termos" className="text-brand font-semibold hover:underline">
                      Termos de Uso
                    </Link>{" "}
                    e a{" "}
                    <Link
                      href="/privacidade"
                      className="text-brand font-semibold hover:underline"
                    >
                      Política de Privacidade
                    </Link>
                    .
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className={AUTH_PILL_CTA}
                  style={{
                    background:
                      "linear-gradient(135deg, #c084fc 0%, #751BB4 55%, #7e22ce 100%)",
                    boxShadow: "0 4px 20px rgba(117, 27, 180,0.40)",
                    fontSize: "13px",
                  }}
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Criando conta...</span>
                    </>
                  ) : (
                    "Concordar e cadastrar"
                  )}
                </button>
              </motion.form>
            )}

            {/* ── Login ── */}
            {mode === "login" && (
              <motion.form
                key="login"
                initial={false}
                onSubmit={handleLogin}
                className="space-y-5 relative z-10"
              >
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-start gap-2 bg-red-500/10 border-l-4 border-red-500 rounded-md p-3 text-sm text-red-400"
                    >
                      <WarningCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <GoogleSignInButton
                  loading={googleLoading}
                  disabled={loading}
                  label="Entrar com Google"
                  onClick={() => {
                    void handleGoogleLogin("login");
                  }}
                />

                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.12)" }} />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "#aaa" }}
                  >
                    ou
                  </span>
                  <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.12)" }} />
                </div>

                <input
                  id="email"
                  type="email"
                  value={email}
                  disabled={loading}
                  onChange={handleEmailChange}
                  placeholder="Seu e-mail"
                  required
                  autoComplete="email"
                  className={AUTH_UNDERLINE_INPUT}
                />

                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    disabled={loading}
                    onChange={handlePasswordChange}
                    onKeyUp={handlePasswordKeyDown}
                    onKeyDown={handlePasswordKeyDown}
                    placeholder="Senha"
                    required
                    autoComplete="current-password"
                    className={cn(AUTH_UNDERLINE_INPUT, "pr-9")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors p-1"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeSlash className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Sempre montado (só a opacidade muda) — o espaço já fica
                    reservado no fluxo, então ativar/desativar Caps Lock não
                    empurra o resto do formulário nem recentraliza o card. */}
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] text-warning transition-opacity",
                    capsLockActive ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden={!capsLockActive}
                >
                  <WarningCircle className="w-3 h-3 flex-shrink-0" weight="fill" />
                  <span>Caps Lock está ativado</span>
                </div>

                <label
                  htmlFor="rememberMe"
                  className="relative z-20 flex min-h-[40px] cursor-pointer touch-manipulation select-none items-center gap-2.5"
                >
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    disabled={loading}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                      rememberMe ? "bg-brand" : "border-[1.5px] bg-transparent",
                    )}
                    style={!rememberMe ? { borderColor: "rgba(0,0,0,0.2)" } : undefined}
                  >
                    {rememberMe && <Check className="h-3 w-3 text-white" weight="bold" />}
                  </span>
                  <span className="text-sm text-text-secondary">Manter conectado</span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className={AUTH_PILL_CTA}
                  style={{
                    background:
                      "linear-gradient(135deg, #c084fc 0%, #751BB4 55%, #7e22ce 100%)",
                    boxShadow: "0 4px 20px rgba(117, 27, 180,0.40)",
                    fontSize: "13px",
                  }}
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Entrando...</span>
                    </>
                  ) : (
                    "Entrar"
                  )}
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setMode("recovery");
                    setRecoveryEmail(email);
                  }}
                  className="w-full text-center text-sm font-semibold text-brand hover:underline disabled:opacity-50"
                >
                  Esqueceu a senha?
                </button>

                <p className="text-center text-[11px] text-text-tertiary leading-relaxed px-1">
                  Ao usar o Coach Vinny, você concorda com os{" "}
                  <Link href="/termos" className="text-brand font-semibold hover:underline">
                    Termos de Uso
                  </Link>{" "}
                  e a{" "}
                  <Link
                    href="/privacidade"
                    className="text-brand font-semibold hover:underline"
                  >
                    Política de Privacidade
                  </Link>
                  .
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer com suporte polido e ícone */}
        <div className="mt-6 text-center pb-6 lg:pb-0">
          <button
            onClick={handleSupportClick}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs transition-all shadow-sm active:scale-95"
            style={{
              border: '1px solid rgba(0,0,0,0.12)',
              background: '#fff',
              color: '#555',
            }}
          >
            <ChatCircle className="w-4 h-4 text-[#10B981]" weight="fill" />
            <span>Precisa de ajuda? Fale com o suporte</span>
          </button>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
