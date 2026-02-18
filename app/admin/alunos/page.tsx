"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";

interface ProfileRow {
  id: string;
  full_name?: string | null;
  email?: string | null;
  status_pagamento?: string | null;
  created_at?: string | null;
}

export default function AdminAlunosPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabaseClient
        .from("profiles")
        .select("id, full_name, email, status_pagamento, created_at")
        .eq("role", "aluno")
        .order("created_at", { ascending: false })
        .limit(200);

      if (query.trim().length > 0) {
        q = q.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
      }

      const { data, error: fetchError } = await q;
      if (fetchError) throw fetchError;

      setRows((data as ProfileRow[]) || []);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    fetchData();
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    return d.toLocaleDateString("pt-BR");
  };

  return (
    <div className="min-h-screen bg-coach-black p-8 pt-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Alunos</h1>
            <p className="text-gray-400">Gestao de alunos e status de pagamento.</p>
          </div>
          <Link
            href="/admin/alunos/novo"
            className="group relative px-6 py-4 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Novo Aluno
          </Link>
        </div>

        <form onSubmit={handleSearch} className="mb-6 flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou email"
            className="flex-1 px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/40 focus:shadow-[0_0_20px_rgba(212,175,55,0.05)] transition-all duration-300"
          />
          <button
            type="submit"
            className="px-6 py-4 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98]"
          >
            Buscar
          </button>
        </form>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400 text-sm">Carregando alunos...</p>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-2xl">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum aluno encontrado</h3>
            <p className="text-gray-400 mb-6">Comece adicionando seu primeiro aluno</p>
            <Link
              href="/admin/alunos/novo"
              className="inline-block px-6 py-3 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-500 active:scale-[0.98]"
            >
              Adicionar Aluno
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {rows.map((r) => (
              <div
                key={r.id}
                className="group relative bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.04] hover:border-yellow-500/20 transition-all duration-300 cursor-pointer"
                onClick={() => router.push(`/admin/aluno/${r.id}`)}
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-yellow-500/90 transition-colors">
                      {r.full_name || "Aluno"}
                    </h3>
                    <p className="text-sm text-gray-400 truncate">{r.email || "Sem e-mail"}</p>
                  </div>
                  
                  {/* Badge de Status */}
                  {r.status_pagamento === "pago" ? (
                    <span className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                      Ativo
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                      Inativo
                    </span>
                  )}
                </div>

                {/* Informações Adicionais */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Cadastrado em {formatDate(r.created_at)}</span>
                  </div>
                </div>

                {/* Botão de Ação */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/admin/aluno/${r.id}`);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-[#B8860B] via-[#FFD700] to-[#B8860B] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-yellow-600/20 shadow-[0_10px_20px_-10px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_30px_-5px_rgba(212,175,55,0.5)] hover:scale-[1.02] transition-all duration-300 active:scale-[0.98] opacity-0 group-hover:opacity-100"
                >
                  Ver Perfil Completo
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
