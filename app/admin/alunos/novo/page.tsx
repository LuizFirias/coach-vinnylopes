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
      <div className="min-h-screen bg-coach-black p-8 pt-8">
        <div className="max-w-2xl mx-auto card-glass text-gray-300 text-center">
          Validando acesso...
        </div>
      </div>
    );
  }

  if (!isCoach) {
    return (
      <div className="min-h-screen bg-coach-black p-8 pt-8">
        <div className="max-w-2xl mx-auto card-glass text-gray-300 text-center">
          Acesso restrito para coach.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-coach-black p-8 pt-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Cadastrar Novo Aluno</h1>
          <p className="text-gray-400">Envie um convite seguro via Supabase.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-6 bg-green-900/20 border border-green-500/30 rounded-2xl">
            <div className="text-green-400 font-semibold mb-3">{success}</div>
            {temporaryPassword && (
              <div className="mt-4 p-4 bg-white/[0.03] border border-yellow-500/30 rounded-xl">
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Senha Temporária:</div>
                <div className="text-2xl font-bold text-yellow-500 tracking-wide font-mono">{temporaryPassword}</div>
                <div className="text-xs text-gray-500 mt-2">⚠️ Forneça esta senha ao aluno para o primeiro acesso</div>
              </div>
            )}
          </div>
        )}

        <div className="card-glass">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1 mb-2">Nome completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome do aluno"
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/40 focus:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-1 mb-2">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aluno@email.com"
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/40 focus:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Enviando convite..." : "Enviar convite"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
