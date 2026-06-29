"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent, Suspense } from "react";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { WarningCircle, SignIn, Eye, EyeSlash, ShieldCheck, ChatCircle, Barbell, ChartLine } from "@phosphor-icons/react";
import PWAInstall from "../components/PWAInstall";
import DumbbellLoader from "../components/DumbbellLoader";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";

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
      if (role === "coach" || role === "super_admin") router.replace("/admin/dashboard");
      else router.replace("/aluno/dashboard");
    };
    checkExistingSession();
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
        setError("Não conseguimos acessar com esses dados. Confira seu e-mail e senha.");
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

        let defaultRoute = "/aluno/dashboard";
        if (role === "coach" || role === "super_admin") defaultRoute = "/admin/dashboard";

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
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center lg:items-stretch lg:flex-row antialiased overflow-hidden">
      <PWAInstall />

      {/* Lado Esquerdo - Hero Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-[50%] flex-col justify-between p-12 bg-surface-1 border-r border-border-subtle relative overflow-hidden select-none">
        {/* Fundo com Imagem e Gradientes */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] hover:scale-105" 
          style={{ 
            backgroundImage: `url('/images/auth/auron-login-hero.jpg')`,
            backgroundColor: 'var(--color-surface-0)'
          }} 
        />
        {/* Overlay escuro/azulado */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-subtle/10 via-transparent to-transparent pointer-events-none" />

        {/* Logo / Marca */}
        <div className="relative z-10 flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Logo Auronfit"
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
          />
          <span className="font-bold text-sm text-text-primary tracking-widest uppercase font-display">
            AURONFIT
          </span>
        </div>

        {/* Headline e Proposições de Valor */}
        <div className="relative z-10 max-w-md my-auto space-y-6">
          <div className="space-y-3">
            <h2 className="text-2xl xl:text-3xl font-extrabold text-text-primary tracking-tight font-display leading-tight">
              Sua consultoria conectada à evolução dos seus alunos.
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              Gerencie treinos, nutrição, progresso, feedbacks e cobranças em uma única plataforma.
            </p>
          </div>

          {/* Pontos de valor */}
          <div className="space-y-4 pt-6 border-t border-border-subtle/30">
            <div className="flex items-start gap-2.5">
              <Barbell className="w-4 h-4 text-brand mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-text-primary">Treinos digitais e PDFs</p>
                <p className="text-[11px] text-text-secondary">Fichas completas, execuções guiadas e PDFs de nutrição em um só lugar.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ChartLine className="w-4 h-4 text-brand mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-text-primary">Dados reais de progresso</p>
                <p className="text-[11px] text-text-secondary">Histórico de cargas, medidas antropométricas e fotos de evolução estruturadas.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ChatCircle className="w-4 h-4 text-brand mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-text-primary">Gestão e Feedbacks</p>
                <p className="text-[11px] text-text-secondary">Caixa de entrada integrada para responder dúvidas e alertas de dor.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do Hero */}
        <div className="relative z-10">
          <p className="text-[9px] text-text-disabled uppercase tracking-widest leading-none">
            AURON conecta quem prescreve com quem evolui.
          </p>
        </div>
      </div>

      {/* Lado Direito - Form Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 lg:p-16 relative z-10 w-full max-w-lg lg:max-w-none mx-auto">
        
        {/* Glow decorativo de fundo (Mobile Only) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-brand/5 rounded-full blur-[120px]" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-brand/5 rounded-full blur-[120px]" />
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          {!logoFailed ? (
            <Image
              src="/logo.png"
              alt="Auronfit"
              width={140}
              height={50}
              priority
              onError={() => setLogoFailed(true)}
              className="w-36 h-auto drop-shadow-2xl"
            />
          ) : (
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="text-brand w-6 h-6" />
              <h1 className="text-lg font-bold text-text-primary tracking-widest uppercase font-display">AURONFIT</h1>
            </div>
          )}
        </div>

        {/* Seletor Coach/Aluno */}
        {mode === "login" && (
          <div className="w-full max-w-[380px] bg-surface-2 p-0.5 rounded-lg border border-border-subtle flex mb-5 relative z-10 h-10 items-center">
            <button
              type="button"
              onClick={() => { setRoleTab("coach"); setError(null); }}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all h-8.5",
                roleTab === "coach"
                  ? "bg-surface-0 border border-brand/20 text-brand shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              Coach
            </button>
            <button
              type="button"
              onClick={() => { setRoleTab("aluno"); setError(null); }}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all h-8.5",
                roleTab === "aluno"
                  ? "bg-surface-0 border border-brand/20 text-brand shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              Aluno
            </button>
          </div>
        )}

        {/* Form Card */}
        <div className="w-full max-w-[380px] bg-surface-1 border border-border-subtle shadow-sm p-6 md:p-7 rounded-xl relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            {/* ── Recuperar senha ── */}
            {mode === "recovery" && (
              <motion.div
                key="recovery"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
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
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary ml-0.5">
                        E-mail de acesso
                      </label>
                      <input
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => { setRecoveryEmail(e.target.value); setRecoveryError(null); }}
                        placeholder="seu@email.com"
                        required
                        className="w-full h-10 bg-surface-0 border border-border-subtle text-text-primary px-3.5 rounded-lg text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
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
                      className="w-full h-10 bg-brand text-text-on-brand rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {recoveryLoading
                        ? <div className="w-3.5 h-3.5 border-2 border-text-on-brand/20 border-t-text-on-brand rounded-full animate-spin" />
                        : "Enviar link de recuperação"}
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleLogin}
                className="space-y-4 relative z-10"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary ml-0.5">
                    E-mail de acesso
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled={loading}
                    onChange={handleEmailChange}
                    placeholder="seu@email.com"
                    required
                    className="w-full h-10 bg-surface-0 border border-border-subtle text-text-primary px-3.5 rounded-lg text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center ml-0.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
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
                      type={showPassword ? "text" : "password"}
                      value={password}
                      disabled={loading}
                      onChange={handlePasswordChange}
                      placeholder="••••••••"
                      required
                      className="w-full h-10 bg-surface-0 border border-border-subtle text-text-primary px-3.5 pr-10 rounded-lg text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors p-1"
                    >
                      {showPassword ? <EyeSlash className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
                        className="bg-danger/10 border border-danger/20 text-danger px-3 py-2 rounded-lg text-xs flex items-center gap-2 overflow-hidden mb-3.5"
                      >
                        <WarningCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 bg-brand text-text-on-brand rounded-lg text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-3.5 h-3.5 border-2 border-text-on-brand/20 border-t-text-on-brand rounded-full animate-spin" />
                    ) : (
                      <>
                        {roleTab === "coach" ? "Entrar como coach" : "Entrar como aluno"}
                        <SignIn className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-center"
        >
          <button
            onClick={handleSupportClick}
            className="text-text-disabled text-xs hover:text-brand transition-colors flex items-center gap-2 mx-auto"
          >
            <ChatCircle className="w-3.5 h-3.5" />
            Precisa de ajuda? Fale com o suporte
          </button>
        </motion.div>

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
