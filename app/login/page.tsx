"use client";

import React, { useState, FormEvent, ChangeEvent, Suspense } from "react";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, LogIn, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);

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
        setError("Credenciais inválidas");
        setLoading(false);
        return;
      }

      if (data?.session && data.user) {
        console.log("✅ Autenticação bem-sucedida, User ID:", data.user.id);
        
        const { data: profileData, error: profileError } = await supabaseClient
          .from("profiles")
          .select("id, role")
          .eq("id", data.user.id)
          .single();

        console.log("📋 Profile Data:", profileData);
        console.log("❌ Profile Error:", profileError);

        if (profileError) {
          console.error("Detalhes completos do erro:", {
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            code: profileError.code
          });
          
          setError(
            `Erro ao buscar perfil: ${profileError.message || profileError.code || 'sem detalhes'}. ` +
            `Verifique se as políticas RLS estão corretas no Supabase (execute fix-rls-profiles-v2.sql).`
          );
          await supabaseClient.auth.signOut();
          setLoading(false);
          return;
        }

        if (!profileData) {
          setError("Perfil não encontrado. Entre em contato com o administrador.");
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

        router.push(defaultRoute);
      }
    } catch (err) {
      setError("Credenciais inválidas");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-iron-black flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md flex flex-col items-center">
        
        {/* Bloco da Logo - Moderno e Limpo */}
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 flex flex-col items-center text-center z-10 mb-10">
          {!logoFailed ? (
            <div className="bg-iron-gray p-6 rounded-[40px] shadow-2xl mb-6 group transition-all hover:scale-105 duration-500 border border-white/5">
              <Image
                src="/logo.png"
                alt="Coach Logo"
                width={200}
                height={200}
                priority
                onError={() => setLogoFailed(true)}
                style={{ height: "auto" }}
                className="w-40 sm:w-44 object-contain"
              />
            </div>
          ) : (
            <div className="mb-6 bg-iron-gray px-8 py-6 rounded-[40px] shadow-2xl border border-white/5">
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Ironberg <span className="text-iron-red">Style</span></h1>
              <p className="text-xs tracking-[0.4em] text-iron-gold font-black uppercase">Exclusivity</p>
            </div>
          )}
          <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">
            Plataforma Alta Performance
          </p>
        </div>

        {/* Card de Login */}
        <div className="w-full bg-iron-gray rounded-[48px] shadow-2xl p-10 border border-white/5 relative group overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-iron-red/5 rounded-bl-[100px] pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
          
          <div className="relative">
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">Acesso <span className="text-iron-red">Atleta</span></h2>
            <p className="text-zinc-500 text-sm font-medium mb-10">Identifique-se para acessar seu painel.</p>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">
                  E-mail
                </label>
                <div className="relative group">
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="exemplo@email.com"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-medium placeholder:text-zinc-800 focus:ring-2 focus:ring-iron-red focus:border-iron-red transition-all"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">
                  Senha
                </label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white font-medium placeholder:text-zinc-800 focus:ring-2 focus:ring-iron-red focus:border-iron-red transition-all"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-iron-red transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-iron-red/10 border border-iron-red/20 text-iron-red px-5 py-4 rounded-2xl text-xs font-bold animate-slide-up flex items-center gap-3">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-iron-red/90 backdrop-blur-xl text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-[0_0_25px_rgba(227,6,19,0.5)] hover:shadow-[0_0_35px_rgba(227,6,19,0.7)] hover:bg-iron-red border border-iron-red/30 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                    Entrar Agora
                  </>
                )}
              </button>
            </form>
          </div>
        </div>



        <button 
          onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
          className="mt-12 text-zinc-600 text-[10px] font-bold border-b border-transparent hover:border-zinc-500 hover:text-zinc-400 uppercase tracking-[0.2em] transition-all duration-300"
        >
          Solicitar suporte técnico
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-iron-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-iron-red border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
