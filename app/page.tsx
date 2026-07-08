"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent, Suspense } from "react";
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
  Barbell, 
  ChartLine,
  ArrowRight,
  Check
} from "@phosphor-icons/react";
import PWAInstall from "./components/PWAInstall";
import DumbbellLoader from "./components/DumbbellLoader";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { getPostLoginPath } from "@/lib/auth/getPostLoginPath";

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

  const [roleTab, setRoleTab] = useState<"coach" | "aluno">("coach");

  // Novas features da especificação de melhorias de login
  const [rememberMe, setRememberMe] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [coachCount, setCoachCount] = useState<number | null>(null);

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
    setRoleTab(tab);
    setError(null);
    if (typeof window !== "undefined") {
      localStorage.setItem("auronfit-login-role-tab", tab);
    }
  };

  useEffect(() => {
    // Carregar e-mail salvo se a opção "Lembrar-me" estiver ativada
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("auronfit-remember-email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }

      const savedRoleTab = localStorage.getItem("auronfit-login-role-tab");
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      if (tabParam === "aluno" || tabParam === "coach") {
        setRoleTab(tabParam);
      } else if (savedRoleTab === "aluno" || savedRoleTab === "coach") {
        setRoleTab(savedRoleTab);
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
        .select("role, must_change_password, first_access_completed")
        .eq("id", session.user.id)
        .single();
      if (profile) {
        router.replace(getPostLoginPath(profile));
      } else {
        router.replace("/aluno/dashboard");
      }
    };
    checkExistingSession();

    fetch("/api/public/coach-count")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data?.count === "number") setCoachCount(data.count);
      })
      .catch(() => {});
  }, [router]);

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); setError(null); };
  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => { setPassword(e.target.value); setError(null); };

  // Validador de E-mail
  const isValidEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

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
          localStorage.setItem("auronfit-remember-email", email);
        } else {
          localStorage.removeItem("auronfit-remember-email");
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
          .select("id, role, must_change_password, first_access_completed")
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

        if (roleTab === "aluno" && isCoachAccount) {
          setError("Esta conta é de coach. Selecione a aba Coach para entrar.");
          await supabaseClient.auth.signOut();
          setLoading(false);
          return;
        }

        if (roleTab === "coach" && !isCoachAccount) {
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

  return (
    <div className="min-h-[100dvh] bg-surface-0 flex flex-col lg:flex-row antialiased selection:bg-brand/35 selection:text-white">
      <PWAInstall />

      {/* Glow decorativo - Hidden on mobile to prevent performance lag */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-brand/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-brand/5 rounded-full blur-[120px]" />
      </div>

      {/* Lado Esquerdo - Hero Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-[50%] lg:h-auto flex-col justify-between p-12 bg-surface-1 border-r border-border-subtle relative overflow-hidden select-none">
        {/* Fundo com Imagem e Gradientes */}
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ 
            backgroundImage: `url('/images/auth/auron-login-hero.webp')`,
            backgroundColor: 'var(--color-surface-0)'
          }} 
        />
        {/* Overlay escuro/azulado */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-subtle/10 via-transparent to-transparent pointer-events-none" />

        {/* Logo / Marca */}
        <div className="relative z-10 flex items-center gap-2">
          <Image
            src="/logo.webp"
            alt="Logo Auronfit"
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
          />
          <span className="font-bold text-xs lg:text-sm text-text-primary tracking-widest uppercase font-display">
            AURONFIT
          </span>
        </div>

        {/* Headline e Proposições de Valor */}
        <div className="relative z-10 max-w-md lg:my-auto mt-2 lg:mt-0 space-y-6">
          <div className="space-y-2 lg:space-y-3">
            <h2 className="text-base sm:text-xl lg:text-2xl xl:text-3xl font-extrabold text-text-primary tracking-tight font-display leading-tight">
              Sua consultoria conectada à evolução dos seus alunos.
            </h2>
            <p className="text-[10px] sm:text-xs text-text-secondary leading-relaxed hidden sm:block lg:block">
              Gerencie treinos, nutrição, progresso, feedbacks e cobranças in uma única plataforma.
            </p>
          </div>

          {/* Pontos de valor - Ocultados em mobile para otimizar espaço */}
          <div className="space-y-4 pt-6 border-t border-border-subtle/30 hidden lg:block">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                <Barbell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary font-display">Seus alunos recebem tudo em um lugar</p>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">Treinos, PDFs de nutrição e execuções guiadas, sem precisar de WhatsApp ou planilha.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                <ChartLine className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary font-display">Evolução que você mostra, não só sente</p>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">Histórico de cargas, medidas e fotos organizados automaticamente.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                <ChatCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary font-display">Nunca perca um feedback de aluno</p>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">Caixa integrada com alertas de dor e dúvidas, tudo em um painel.</p>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3 text-sm text-white/60">
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full bg-blue-500/40 border border-white/10" />
                <div className="w-7 h-7 rounded-full bg-blue-400/40 border border-white/10" />
                <div className="w-7 h-7 rounded-full bg-blue-600/40 border border-white/10" />
              </div>
              <span>
                +{coachCount ?? 230} coaches já gerenciam seus alunos no AURON
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé do Hero - Ocultado em mobile */}
        <div className="relative z-10 hidden lg:block">
          <p className="text-[9px] text-text-disabled uppercase tracking-widest leading-none">
            AURON conecta quem prescreve com quem evolui.
          </p>
        </div>
      </div>

      {/* Lado Direito - Form Panel */}
      <div className="flex flex-1 flex-col items-center w-full max-w-lg lg:max-w-none mx-auto relative z-10 px-6 py-6 sm:py-8 md:px-12 lg:px-16 lg:justify-center lg:min-h-screen">
        
        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-4 sm:mb-6 lg:mb-8">
          {!logoFailed ? (
            <Image
              src="/logo.webp"
              alt="Auronfit"
              width={200}
              height={70}
              priority
              onError={() => setLogoFailed(true)}
              className="w-36 lg:w-48 h-auto drop-shadow-2xl animate-fade-in"
            />
          ) : (
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="text-brand w-6 h-6" />
              <h1 className="text-lg lg:text-xl font-bold text-text-primary tracking-widest uppercase font-display">AURONFIT</h1>
            </div>
          )}
        </div>

        {/* Seletor Coach/Aluno - Aba com estilo underline de alta fidelidade */}
        {mode === "login" && (
          <div className="relative z-30 mb-4 flex w-full max-w-[380px] gap-1 rounded-full bg-white/5 p-1 sm:mb-6 isolate touch-manipulation">
            <button
              type="button"
              onClick={() => handleRoleTabChange("coach")}
              className={cn(
                "min-h-[44px] flex-1 rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 ease-in-out",
                roleTab === "coach"
                  ? "bg-blue-600 text-white"
                  : "bg-transparent text-gray-400 active:text-white"
              )}
            >
              Coach
            </button>
            <button
              type="button"
              onClick={() => handleRoleTabChange("aluno")}
              className={cn(
                "min-h-[44px] flex-1 rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 ease-in-out",
                roleTab === "aluno"
                  ? "bg-blue-600 text-white"
                  : "bg-transparent text-gray-400 active:text-white"
              )}
            >
              Aluno
            </button>
          </div>
        )}

        {/* Form Card */}
        <div className="w-full max-w-[380px] bg-surface-1 lg:bg-transparent border border-border-subtle lg:border-none shadow-sm lg:shadow-none p-6 md:p-7 lg:p-0 rounded-xl relative">
          
          <AnimatePresence mode="wait">
            {/* ── Recuperar senha ── */}
            {mode === "recovery" && (
              <motion.div
                key="recovery"
                initial={false}
                className="space-y-4 relative z-10"
              >
                <div className="text-center mb-1">
                  <p className="text-xs font-bold text-text-primary uppercase tracking-wider">Recuperar senha</p>
                  <p className="text-[11px] text-text-secondary leading-relaxed mt-1">
                    Digite seu e-mail e enviaremos um link para criar uma nova senha.
                  </p>
                </div>

                {recoverySent ? (
                  <div className="bg-brand-subtle/50 border border-brand-border text-brand p-3 rounded-lg text-xs font-semibold text-center leading-relaxed">
                    E-mail enviado! Verifique sua caixa de entrada (e pasta de spam se necessário).
                  </div>
                ) : (
                  <form onSubmit={handleRecovery} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="recoveryEmail" className="text-xs font-semibold uppercase tracking-wider text-text-secondary block ml-0.5">
                        E-mail de acesso
                      </label>
                      <input
                        id="recoveryEmail"
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => { setRecoveryEmail(e.target.value); setRecoveryError(null); }}
                        placeholder="seu@email.com"
                        required
                        className="w-full h-11 bg-surface-0 border border-border-subtle text-text-primary px-3.5 rounded-lg text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20 transition-all duration-200"
                      />
                    </div>

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
                      className="w-full h-11 bg-brand text-text-on-brand rounded-lg text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {recoveryLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-text-on-brand/20 border-t-text-on-brand rounded-full animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        "Enviar link de recuperação"
                      )}
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => { setMode("login"); setRecoverySent(false); setRecoveryError(null); }}
                  className="w-full text-text-tertiary text-[10px] font-bold uppercase tracking-wider hover:text-text-secondary transition-colors pt-1"
                >
                  ← Voltar ao login
                </button>
              </motion.div>
            )}

            {/* ── Login ── */}
            {mode === "login" && (
              <motion.form
                key="login"
                initial={false}
                onSubmit={handleLogin}
                className="space-y-4 relative z-10"
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

                {/* Email Input com validação inline */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-text-secondary block ml-0.5">
                    E-mail de acesso
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    disabled={loading}
                    onChange={handleEmailChange}
                    placeholder="seu@email.com"
                    required
                    className="w-full h-11 bg-surface-0 border border-border-subtle text-text-primary px-3.5 rounded-lg text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20 transition-all duration-200 disabled:opacity-50"
                  />
                  {email && (
                    <div className={cn(
                       "flex items-center gap-1.5 mt-1.5 text-xs font-medium transition-colors",
                       isValidEmail(email) ? "text-success" : "text-danger"
                    )}>
                      {isValidEmail(email) ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" weight="fill" />
                          <span>E-mail em formato válido</span>
                        </>
                      ) : (
                        <>
                          <WarningCircle className="w-3.5 h-3.5 flex-shrink-0" weight="fill" />
                          <span>Formato de e-mail inválido</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Senha Input com medidor de força e Caps Lock */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-0.5">
                    <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-text-secondary block">
                      Senha
                    </label>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => { setMode("recovery"); setRecoveryEmail(email); }}
                      className="text-[10px] font-bold text-text-tertiary hover:text-brand uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                      Recuperar senha
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      disabled={loading}
                      onChange={handlePasswordChange}
                      onKeyUp={handlePasswordKeyDown}
                      onKeyDown={handlePasswordKeyDown}
                      placeholder="••••••••"
                      required
                      className="w-full h-11 bg-surface-0 border border-border-subtle text-text-primary px-3.5 pr-10 rounded-lg text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20 transition-all duration-200 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors p-1"
                    >
                      {showPassword ? <EyeSlash className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>


                  {/* Alerta de Caps Lock */}
                  {capsLockActive && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-warning animate-fade-in">
                      <WarningCircle className="w-3.5 h-3.5 flex-shrink-0" weight="fill" />
                      <span>Caps Lock está ativado</span>
                    </div>
                  )}
                </div>

                {/* Lembrar-me Checkbox */}
                <label
                  htmlFor="rememberMe"
                  className="relative z-20 flex min-h-[44px] cursor-pointer touch-manipulation select-none items-center gap-2.5 py-1"
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
                      "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded transition-colors duration-200",
                      rememberMe
                        ? "bg-blue-600"
                        : "border-[1.5px] border-gray-600 bg-transparent"
                    )}
                  >
                    {rememberMe && <Check className="h-3 w-3 text-white" weight="bold" />}
                  </span>
                  <span className="text-sm text-gray-400">Lembrar-me neste dispositivo</span>
                </label>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-brand text-text-on-brand rounded-lg text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-text-on-brand/20 border-t-text-on-brand rounded-full animate-spin" />
                        <span>Entrando...</span>
                      </>
                    ) : (
                      <>
                        <span>{roleTab === "coach" ? "Entrar como Coach" : "Entrar como Aluno"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="mt-3 text-center">
                    <Link
                      href={roleTab === "coach" ? "/signup/coach" : "/signup/aluno"}
                      className="block w-full rounded-lg border-[1.5px] border-blue-600 py-3 text-xs font-semibold text-blue-500 transition-colors hover:bg-blue-600/10 touch-manipulation"
                    >
                      Criar minha conta gratuita →
                    </Link>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer com suporte polido e ícone */}
        <div className="mt-6 text-center pb-6 lg:pb-0">
          <button
            onClick={handleSupportClick}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border-subtle rounded-full bg-surface-1 text-text-secondary text-xs hover:text-brand hover:border-brand/40 transition-all shadow-sm active:scale-95"
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
