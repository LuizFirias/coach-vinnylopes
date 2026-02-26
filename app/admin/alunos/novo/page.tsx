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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isCoach) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 md:p-8">
        <div className="max-w-2xl w-full bg-[#0F0F0F] p-12 rounded-3xl border border-[#1a1a1a] text-zinc-600 text-center font-black uppercase tracking-widest italic">
          Acesso restrito para coach.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6 md:p-12 lg:pl-28">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none mb-3">
              Recrutar <span className="text-zinc-500 tracking-tighter">Atleta</span>
            </h1>
            <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.4em] italic leading-loose">Protocolo de Convite & Acesso Imediato</p>
        </header>

        {error && (
          <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-10 p-8 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-3xl shadow-2xl">
            <div className="text-[#D4AF37] font-black uppercase tracking-[0.3em] text-[10px] mb-8 flex items-center gap-4 italic">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center text-black">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              {success}
            </div>
            {temporaryPassword && (
              <div className="p-8 bg-black border border-[#1a1a1a] rounded-3xl shadow-2xl text-center">
                <div className="text-[10px] uppercase tracking-[0.4em] text-zinc-700 font-black mb-6">SENHA TEMPORÁRIA DE ATIVAÇÃO</div>
                <div className="text-4xl md:text-5xl font-black text-white tracking-[0.1em] font-mono bg-[#0F0F0F] py-8 px-4 rounded-2xl select-all border border-[#1a1a1a] shadow-inner mb-8">
                  {temporaryPassword}
                </div>
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-red-500/10 text-red-500 rounded-full">
                   <span className="text-[9px] font-black uppercase tracking-widest italic">⚠️ Copie e forneça ao atleta</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-[#0F0F0F] p-10 md:p-14 rounded-[40px] border border-[#1a1a1a] relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/5 rounded-bl-[120px] transition-all group-hover:scale-110 blur-3xl"></div>
          
          <form onSubmit={handleSubmit} className="space-y-10 relative">
            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-zinc-700 ml-4">NOME COMPLETO DO ATLETA</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: João Vitor Performance"
                className="w-full px-8 py-6 bg-black border border-[#1a1a1a] rounded-2xl text-white placeholder-zinc-900 font-bold focus:outline-none focus:border-[#D4AF37] transition-all"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-zinc-700 ml-4">E-MAIL DE CADASTRO</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="atleta@premium.com"
                className="w-full px-8 py-6 bg-black border border-[#1a1a1a] rounded-2xl text-white placeholder-zinc-900 font-bold focus:outline-none focus:border-[#D4AF37] transition-all"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-7 bg-[#D4AF37] text-black text-[12px] font-black uppercase tracking-[0.5em] rounded-3xl shadow-xl hover:bg-white hover:-translate-y-1 transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-4"
            >
              {loading ? (
                <div className="flex items-center gap-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-black/20 border-t-black"></div>
                  INDEXANDO...
                </div>
              ) : (
                "LIBERAR ACESSO AGORA"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
