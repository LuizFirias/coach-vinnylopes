"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent, Suspense } from "react";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { WarningCircle, SignIn, Eye, EyeSlash, ShieldCheck, ChatCircle, Fingerprint } from "@phosphor-icons/react";
import PWAInstall from "../components/PWAInstall";
import DumbbellLoader from "../components/DumbbellLoader";
import { motion, AnimatePresence } from "framer-motion";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);

  const [mode, setMode] = useState<"login" | "recovery">("login");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const [biometriaDisponivel, setBiometriaDisponivel] = useState(false);

  useEffect(() => {
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
        .select("role")
        .eq("id", session.user.id)
        .single();
      const role = profile?.role || "aluno";
      if (role === "coach") router.replace("/admin/alunos");
      else if (role === "super_admin") router.replace("/super-admin");
      else router.replace("/aluno/treinos");
    };
    checkExistingSession();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setBiometriaDisponivel(available))
        .catch(() => {});
    }
  }, []);

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); setError(null); };
  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => { setPassword(e.target.value); setError(null); };

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

  const handleBiometria = async () => {
    // Biometria completa requer integração backend com WebAuthn
    // Por ora, redireciona para login normal com foco no email
    alert('Para usar biometria, faça login uma vez com email e senha. Nas próximas vezes, o dispositivo oferecerá autenticação biométrica.');
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
        setError("Credenciais inválidas. Verifique seu e-mail e senha.");
        setLoading(false);
        return;
      }

      if (data?.session && data.user) {
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
          .select("id, role")
          .eq("id", data.user.id)
          .single();

        if (profileError || !profileData) {
          setError("Perfil de acesso não localizado.");
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
        const role = profileData?.role || "aluno";

        let defaultRoute = "/aluno/treinos";
        if (role === "coach") defaultRoute = "/admin/alunos";
        if (role === "super_admin") defaultRoute = "/super-admin";

        const allowAdmin = role === "coach" || role === "super_admin";

        if (from) {
          const isAlunoRoute = from.startsWith("/aluno");
          const isAdminRoute = from.startsWith("/admin");
          const isSuperAdminRoute = from.startsWith("/super-admin");
          if ((isAlunoRoute && role === "aluno") || ((isAdminRoute || isSuperAdminRoute) && allowAdmin)) {
            router.push(from);
            return;
          }
        }

        if (role === "aluno") {
          const { data: userData } = await supabaseClient.auth.getUser();
          if (userData.user?.user_metadata?.first_login !== false) {
            router.push("/aluno/perfil?firstAccess=true");
            return;
          }
        }

        router.push(defaultRoute);
      }
    } catch {
      setError("Erro ao processar login. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 antialiased overflow-hidden">
      {/* Glow decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-brand/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-brand/5 rounded-full blur-[120px]" />
      </div>

      <PWAInstall />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[400px] flex flex-col items-center relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-10">
          {!logoFailed ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-6"
            >
              <Image
                src="/logo.png"
                alt="Coach Logo"
                width={200}
                height={70}
                priority
                onError={() => setLogoFailed(true)}
                className="w-52 h-auto drop-shadow-2xl"
              />
            </motion.div>
          ) : (
            <div className="mb-6 flex flex-col items-center">
              <div className="w-20 h-20 bg-surface-2 border border-border-subtle rounded-2xl flex items-center justify-center mb-4 shadow-elev-1">
                <ShieldCheck className="text-brand w-10 h-10" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary tracking-[0.2em] uppercase">COACH VINNY</h1>
            </div>
          )}
          <p className="text-xs text-text-tertiary uppercase tracking-[0.2em] max-w-[280px] leading-relaxed">
            Plataforma Exclusiva de <br />
            <span className="text-brand font-semibold">Alta Performance</span>
          </p>
        </div>

        {/* Card */}
        <div className="w-full bg-surface-1/80 backdrop-blur-xl border border-border-subtle shadow-elev-2 p-8 rounded-[32px] relative overflow-hidden">
          <AnimatePresence mode="wait">

            {/* ── Recuperar senha ── */}
            {mode === "recovery" && (
              <motion.div
                key="recovery"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5 relative z-10"
              >
                <div className="text-center">
                  <p className="text-sm font-semibold text-text-primary mb-1">Recuperar senha</p>
                  <p className="text-xs text-text-tertiary leading-relaxed">
                    Digite seu e-mail e enviaremos um link para criar uma nova senha.
                  </p>
                </div>

                {recoverySent ? (
                  <div className="bg-brand-subtle border border-brand-border text-brand px-4 py-3 rounded-2xl text-xs font-semibold text-center">
                    E-mail enviado! Verifique sua caixa de entrada.
                  </div>
                ) : (
                  <form onSubmit={handleRecovery} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary ml-1">
                        E-mail de acesso
                      </label>
                      <input
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => { setRecoveryEmail(e.target.value); setRecoveryError(null); }}
                        placeholder="seu@email.com"
                        required
                        className="w-full h-14 bg-surface-0 border border-border-subtle text-text-primary px-5 rounded-2xl text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
                      />
                    </div>

                    <AnimatePresence>
                      {recoveryError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-2xl text-xs flex items-center gap-2 overflow-hidden"
                        >
                          <WarningCircle className="w-4 h-4 flex-shrink-0" />
                          {recoveryError}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={recoveryLoading}
                      className="w-full h-13 bg-brand text-text-on-brand rounded-2xl text-xs font-semibold tracking-caps uppercase shadow-sm shadow-brand/30 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {recoveryLoading
                        ? <div className="w-4 h-4 border-2 border-text-on-brand/20 border-t-text-on-brand rounded-full animate-spin" />
                        : "Enviar link de recuperação"}
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => { setMode("login"); setRecoverySent(false); setRecoveryError(null); }}
                  className="w-full text-text-tertiary text-2xs uppercase tracking-caps hover:text-text-secondary transition-colors pt-1"
                >
                  ← Voltar ao login
                </button>
              </motion.div>
            )}

            {/* ── Login ── */}
            {mode === "login" && (
              <motion.form
                key="login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleLogin}
                className="space-y-5 relative z-10"
              >
                <div className="space-y-2">
                  <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary ml-1">
                    E-mail de acesso
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="seu@email.com"
                    required
                    className="w-full h-14 bg-surface-0 border border-border-subtle text-text-primary px-5 rounded-2xl text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">
                      Senha
                    </label>
                    <button
                      type="button"
                      onClick={() => { setMode("recovery"); setRecoveryEmail(email); }}
                      className="text-xs text-text-tertiary hover:text-brand uppercase tracking-caps transition-colors"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={handlePasswordChange}
                      placeholder="••••••••"
                      required
                      className="w-full h-14 bg-surface-0 border border-border-subtle text-text-primary px-5 pr-14 rounded-2xl text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors p-1"
                    >
                      {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-2xl text-xs flex items-center gap-2 overflow-hidden mb-4"
                      >
                        <WarningCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-13 bg-brand text-text-on-brand rounded-2xl text-xs font-semibold uppercase tracking-caps shadow-sm shadow-brand/30 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-text-on-brand/20 border-t-text-on-brand rounded-full animate-spin" />
                    ) : (
                      <>Acessar Agora <SignIn className="w-4 h-4"  /></>
                    )}
                  </button>
                </div>
              </motion.form>
            )}

          </AnimatePresence>

          {biometriaDisponivel && mode === 'login' && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              type="button"
              onClick={handleBiometria}
              className="w-full flex items-center justify-center gap-2 h-12 bg-transparent border border-border-strong rounded-2xl text-text-secondary text-sm hover:border-brand/40 hover:text-text-primary transition-all mt-3"
            >
              <Fingerprint className="w-5 h-5" />
              Entrar com biometria
            </motion.button>
          )}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 text-center"
        >
          <button
            onClick={handleSupportClick}
            className="text-text-disabled text-xs hover:text-brand transition-colors flex items-center gap-2 mx-auto"
          >
            <ChatCircle className="w-3.5 h-3.5" />
            Precisa de ajuda? Fale com o suporte
          </button>
        </motion.div>

      </motion.div>
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
