"use client";

import { useState, useEffect, Suspense } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Eye, EyeSlash, ShieldCheck, WarningCircle, CheckCircle } from "@phosphor-icons/react";
import DumbbellLoader from "../components/DumbbellLoader";
import { motion, AnimatePresence } from "framer-motion";
import { getPostLoginPath } from "@/lib/auth/getPostLoginPath";

function ResetPasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [hashError, setHashError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(window.location.search);

    // Caso 1: Supabase retornou erro no hash (ex: otp_expired)
    const errCode = hashParams.get("error_code");
    if (errCode) {
      setHashError(
        errCode === "otp_expired"
          ? "Este link de recuperação expirou. Solicite um novo na tela de login."
          : hashParams.get("error_description")?.replace(/\+/g, " ") || "Link inválido ou expirado."
      );
      return;
    }

    // Caso 2: Fluxo PKCE — Supabase redireciona com ?code= na query string
    const code = queryParams.get("code");
    if (code) {
      supabaseClient.auth
        .exchangeCodeForSession(code)
        .then(({ error: sessionError }) => {
          if (sessionError) {
            setHashError("Não foi possível verificar o link. Solicite um novo.");
          } else {
            setSessionReady(true);
          }
        });
      return;
    }

    // Caso 3: Fluxo implícito — hash contém access_token de recovery
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const type = hashParams.get("type");

    if (accessToken && type === "recovery") {
      supabaseClient.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken ?? "" })
        .then(({ error: sessionError }) => {
          if (sessionError) {
            setHashError("Não foi possível verificar o link. Solicite um novo.");
          } else {
            setSessionReady(true);
          }
        });
      return;
    }

    // Caso 4: Sem parâmetros — aguardar evento onAuthStateChange (fallback)
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setSessionReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const user = authData?.user;

      const { error: updateError } = await supabaseClient.auth.updateUser({ password });
      if (updateError) throw updateError;

      if (user) {
        await supabaseClient
          .from("profiles")
          .update({ must_change_password: false })
          .eq("id", user.id);
      }

      const { data: profile } = user
        ? await supabaseClient
            .from("profiles")
            .select("role, first_access_completed, must_change_password")
            .eq("id", user.id)
            .single()
        : { data: null };

      setSuccess(true);
      const destination = profile
        ? getPostLoginPath({ ...profile, must_change_password: false })
        : "/aluno/dashboard";
      setTimeout(() => router.replace(destination), 2500);
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar senha. O link pode ter expirado.");
    } finally {
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[400px] flex flex-col items-center relative z-10"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-20 h-20 bg-surface-2 border border-card rounded-2xl flex items-center justify-center mb-6 shadow-elev-1"
          >
            <ShieldCheck className="text-brand w-10 h-10" />
          </motion.div>
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">Crie sua senha</h1>
          <p className="text-text-tertiary text-xs mt-2 max-w-[260px] leading-relaxed">
            Bem-vindo! Defina sua senha para acessar a plataforma.
          </p>
        </div>

        {/* Card */}
        <div className="w-full bg-surface-1/80 backdrop-blur-xl border border-card shadow-elev-2 p-8 rounded-[32px] relative overflow-hidden">

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4 text-center"
              >
                <CheckCircle className="text-brand w-12 h-12" />
                <p className="text-text-primary text-sm font-semibold">Senha criada com sucesso!</p>
                <p className="text-text-tertiary text-xs">Entrando na plataforma…</p>
              </motion.div>
            ) : hashError ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4 text-center py-4"
              >
                <WarningCircle className="text-danger w-10 h-10" />
                <p className="text-text-primary text-sm font-semibold">Link inválido</p>
                <p className="text-text-tertiary text-xs leading-relaxed max-w-[260px]">{hashError}</p>
                <button
                  onClick={() => router.replace("/login")}
                  className="mt-2 text-brand text-2xs uppercase tracking-caps hover:underline"
                >
                  Solicitar novo link
                </button>
              </motion.div>
            ) : !sessionReady ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4 text-center py-4"
              >
                <div className="w-6 h-6 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
                <p className="text-text-tertiary text-2xs uppercase tracking-caps">Verificando link…</p>
                <p className="text-text-disabled text-2xs mt-2">
                  Se esta tela não avançar, o link pode ter expirado.{" "}
                  <button onClick={() => router.replace("/login")} className="text-brand hover:underline">
                    Voltar ao login
                  </button>
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* Nova senha */}
                <div className="space-y-2">
                  <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary ml-1">
                    Nova senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(null); }}
                      placeholder="Mínimo 8 caracteres"
                      required
                      className="w-full h-14 bg-surface-0 border border-input text-text-primary px-5 pr-14 rounded-2xl text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors p-1"
                    >
                      {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar */}
                <div className="space-y-2">
                  <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary ml-1">
                    Confirmar senha
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(null); }}
                    placeholder="Repita a senha"
                    required
                    className="w-full h-14 bg-surface-0 border border-input text-text-primary px-5 rounded-2xl text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors"
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-2xl text-xs flex items-center gap-2 overflow-hidden"
                    >
                      <WarningCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-13 bg-brand text-text-on-brand rounded-2xl text-xs font-semibold uppercase tracking-caps shadow-sm shadow-brand/30 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-text-on-brand/20 border-t-text-on-brand rounded-full animate-spin" />
                  ) : (
                    "Criar senha e entrar"
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
