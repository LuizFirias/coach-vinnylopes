"use client";

import React, { useState, FormEvent, ChangeEvent, Suspense } from "react";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, LogIn, Eye, EyeOff, ShieldCheck } from "lucide-react";
import PWAInstall from "../components/PWAInstall";
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

  // ... (keeping existing logic for handleEmailChange, handlePasswordChange, handleLogin)
  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError(null);
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("Credenciais inválidas. Verifique seu e-mail e senha.");
        setLoading(false);
        return;
      }

      if (data?.session && data.user) {
        // Ensure session is properly stored in browser storage
        if (typeof window !== 'undefined' && data.session.access_token && data.session.refresh_token) {
          try {
            localStorage.setItem('sb-auth-token', JSON.stringify({
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

        // Check if first access (never changed password)
        if (role === "aluno") {
          const { data: userData } = await supabaseClient.auth.getUser();
          if (userData.user?.user_metadata?.first_login !== false) {
             router.push("/aluno/perfil?firstAccess=true");
             return;
          }
        }

        router.push(defaultRoute);
      }
    } catch (err) {
      setError("Erro ao processar login. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 font-sans antialiased overflow-hidden">
      {/* Background Decorativo Sutil */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-[#D4AF37]/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-[#D4AF37]/5 rounded-full blur-[120px]" />
      </div>

      <PWAInstall />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[400px] flex flex-col items-center relative z-10"
      >
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-12">
          {!logoFailed ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-8"
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
            <div className="mb-8 flex flex-col items-center">
              <div className="w-20 h-20 bg-[#0F0F0F] border border-[#1a1a1a] rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                 <ShieldCheck className="text-[#D4AF37] w-10 h-10" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-[0.2em] uppercase">COACH VINNY</h1>
            </div>
          )}
          
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-[0.2em] max-w-[280px] leading-relaxed">
            Plataforma Exclusiva de <br />
            <span className="text-[#D4AF37]">Alta Performance</span>
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full bg-zinc-900/40 backdrop-blur-2xl border border-white/10 p-10 rounded-[40px] shadow-[0_0_80px_rgba(0,0,0,0.8)] relative overflow-hidden">
          <form onSubmit={handleLogin} className="space-y-8 relative z-10">
            
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold ml-1">E-mail de acesso</label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="seu@email.com"
                required
                className="w-full h-16 bg-black/40 border border-white/10 text-white px-7 rounded-2xl text-sm placeholder:text-zinc-800 focus:outline-none focus:border-iron-gold/40 transition-all font-medium shadow-inner antialiased"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">Senha privada</label>
              </div>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  required
                  className="w-full h-16 bg-black/40 border border-white/10 text-white px-7 rounded-2xl text-sm placeholder:text-zinc-800 focus:outline-none focus:border-iron-gold/40 transition-all font-medium shadow-inner antialiased"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-white transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-500 px-5 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest mb-6 flex items-center gap-3 overflow-hidden"
                  >
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-linear-to-b from-[#F9E29B] via-iron-gold to-iron-gold-dark text-black rounded-2xl font-bold uppercase tracking-[0.2em] text-[11px] hover:brightness-110 hover:scale-[1.01] active:scale-95 transition-all duration-500 shadow-[0_8px_32px_rgba(212,175,55,0.2)] border border-white/20 flex items-center justify-center gap-4 disabled:opacity-50 antialiased"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <>
                    Acessar Agora <LogIn size={18} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <button 
            onClick={() => window.open('https://wa.me/556781232717', '_blank')}
            className="text-zinc-700 text-[10px] font-bold uppercase tracking-[0.4em] hover:text-iron-gold transition-all duration-300 italic flex items-center gap-3"
          >
            <span className="w-8 h-[1px] bg-zinc-900" />
            Suporte Técnico
            <span className="w-8 h-[1px] bg-zinc-900" />
          </button>
        </motion.div>

      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-iron-gold/20 border-t-iron-gold rounded-full animate-spin"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
