"use client";

import React, { useState, FormEvent, ChangeEvent } from "react";
import Image from "next/image";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, LogIn, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
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
        const { data: profileData, error: profileError } = await supabaseClient
          .from("profiles")
          .select("id, role")
          .eq("id", data.user.id)
          .single();

        if (profileError || !profileData) {
          setError("Usuário não encontrado no sistema. Entre em contato com o coach.");
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
        const defaultRoute = role === "coach" ? "/admin/alunos" : "/aluno/treinos";
        const allowAdmin = role === "coach";

        if (from) {
          const isAlunoRoute = from.startsWith("/aluno");
          const isAdminRoute = from.startsWith("/admin");
          if ((isAlunoRoute && !allowAdmin) || (isAdminRoute && allowAdmin)) {
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
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md flex flex-col items-center">
        
        {/* Bloco da Logo - Aproximação Máxima */}
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 flex flex-col items-center text-center z-10 -mb-12">
          {!logoFailed ? (
            <Image
              src="/logo.png"
              alt="Coach Logo"
              width={260}
              height={260}
              priority
              onError={() => setLogoFailed(true)}
              style={{ height: "auto" }}
              className="w-52 sm:w-60 object-contain"
            />
          ) : (
            <div className="mb-2">
              <h1 className="text-4xl font-bold text-white tracking-tight uppercase">Vinny Lopes</h1>
              <p className="text-lg tracking-[0.2em] text-[#D4AF37] font-semibold uppercase">Coach</p>
            </div>
          )}
          <p className="text-gray-300 text-[9px] font-medium tracking-[0.45em] uppercase mt-1">
            Plataforma Premium de Coaching
          </p>
        </div>

        {/* Card de Login */}
        <div className="w-full bg-black/60 backdrop-blur-3xl border-[0.5px] border-yellow-500/20 rounded-3xl p-8 sm:p-10 shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <div className="text-center mb-8 pt-4">
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Entrar na Plataforma</h2>
            <p className="text-gray-400 text-xs tracking-wide">Acesse sua consultoria exclusiva</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-400 text-[11px] font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 ml-1">
                E-mail de acesso
              </label>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="seu@email.com"
                className="w-full px-5 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-yellow-500/40 transition-all duration-300"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 ml-1">
                Sua senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-yellow-500/40 transition-all duration-300"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 mt-4 text-[11px] font-black uppercase tracking-[0.25em] text-black rounded-2xl bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] hover:shadow-[0_15px_35px_rgba(212,175,55,0.25)] transition-all duration-500 active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl"
            >
              {loading ? (
                <span className="opacity-80">Verificando...</span>
              ) : (
                <>
                  <LogIn size={15} strokeWidth={3} />
                  <span>Acessar Agora</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-white/5 text-center">
            <p className="text-[9px] text-gray-400 tracking-[0.3em] uppercase">
              Private Coaching System — 2026
            </p>
          </div>
        </div>

        <button 
          onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
          className="mt-8 text-gray-500 text-[10px] tracking-[0.2em] uppercase hover:text-white transition-all duration-300"
        >
          Solicitar suporte técnico
        </button>
      </div>
    </div>
  );
}