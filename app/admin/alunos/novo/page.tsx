"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";

export default function NovoAlunoPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [isCoach, setIsCoach] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        const user = authData?.user;

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const { data: profileData, error: profileError } = await supabaseClient
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError || profileData?.role !== "coach") {
          router.replace("/aluno/treinos");
          return;
        }

        setIsCoach(true);
      } finally {
        setCheckingRole(false);
      }
    };

    checkRole();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setTemporaryPassword(null);

    if (!fullName.trim() || !email.trim()) {
      setError("Informe nome e e-mail");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim(), email: email.trim() }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        // Exibir mensagem de erro amigável do backend
        throw new Error(data?.error || "Falha ao criar aluno");
      }

      // Exibir mensagem de sucesso e senha temporária
      setSuccess(data?.message || "Aluno cadastrado com sucesso!");
      setTemporaryPassword(data?.temporaryPassword);
      setFullName("");
      setEmail("");
    } catch (err: any) {
      setError(err?.message || "Erro ao criar aluno");
    } finally {
      setLoading(false);
    }
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-purple"></div>
      </div>
    );
  }

  if (!isCoach) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 md:p-8">
        <div className="max-w-2xl w-full bg-white p-8 md:p-12 rounded-2xl shadow-xl text-slate-400 text-center font-black uppercase tracking-widest">
          Acesso restrito para coach.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 pt-16 md:pt-24">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-[0.2em] uppercase mb-4">
            NOVO ALUNO
            <span className="block text-brand-purple text-lg tracking-[0.3em] mt-2">Convite e Acesso</span>
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-6 bg-red-50 border border-red-100 rounded-[30px] text-red-600 text-xs font-black uppercase tracking-widest animate-pulse flex items-center gap-4">
            <span className="text-xl">!</span>
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 md:mb-8 p-6 md:p-8 bg-green-50 border border-green-100 rounded-2xl shadow-sm">
            <div className="text-green-600 font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-4">
              <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">✓</span>
              {success}
            </div>
            {temporaryPassword && (
              <div className="p-6 md:p-8 bg-white border border-green-100 rounded-2xl shadow-inner text-center">
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-black mb-4">Senha Temporária para Acesso</div>
                <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-[0.1em] font-mono bg-slate-50 py-4 md:py-6 px-4 rounded-2xl select-all border border-slate-100">
                  {temporaryPassword}
                </div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-4 md:mt-6 bg-slate-50 inline-block px-4 py-2 rounded-full">
                  ⚠️ Copie e forneça ao aluno
                </p>
              </div>
            )}
          </div>
        )}

        <div className="bg-white p-6 md:p-10 lg:p-12 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 rounded-bl-[100px] transition-all group-hover:scale-110"></div>
          
          <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 relative">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4 mb-2 md:mb-3">Nome completo do Atleta</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full px-4 md:px-6 py-4 md:py-5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 placeholder-slate-300 font-bold focus:outline-none focus:border-brand-purple/30 focus:bg-white transition-all duration-300"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4 mb-2 md:mb-3">Endereço de E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aluno@email.com"
                className="w-full px-4 md:px-6 py-4 md:py-5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 placeholder-slate-300 font-bold focus:outline-none focus:border-brand-purple/30 focus:bg-white transition-all duration-300"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 md:py-6 bg-brand-purple text-white text-[11px] font-black uppercase tracking-[0.4em] rounded-2xl shadow-lg shadow-brand-purple/20 hover:shadow-xl hover:shadow-brand-purple/30 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  ENVIANDO CONVITE...
                </>
              ) : (
                "GERAR ACESSO DO ALUNO"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
