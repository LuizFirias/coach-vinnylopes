"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { 
  Users, 
  UserPlus, 
  Search, 
  Trash2, 
  Calendar, 
  ExternalLink,
  ChevronRight,
  Plus,
  Filter,
  Mail
} from "lucide-react";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja desativar (arquivar) o aluno ${name}? Ele perderá o acesso, mas o histórico será mantido.`)) {
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/delete-student?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Falha ao remover aluno");
      }

      setRows(rows.filter(r => r.id !== id));
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setDeletingId(null);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabaseClient
        .from("profiles")
        .select("id, full_name, email, status_pagamento, created_at")
        .eq("role", "aluno")
        .eq("arquivado", false)
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
    return d.toLocaleDateString("pt-BR", {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-iron-black p-4 md:p-6 lg:p-10 lg:pl-28">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-8 md:mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2 text-iron-red">
              <div className="bg-iron-red/10 p-2 rounded-xl">
                <Users size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-iron-gold">Gestão Master</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">BASE DE <span className="text-gradient-red">ALUNOS</span></h1>
            <p className="text-zinc-500 text-sm font-medium mt-1">Gerencie seus atletas e acompanhe os status de adesão.</p>
          </div>
          
          <Link
            href="/admin/alunos/novo"
            className="group inline-flex items-center justify-center gap-3 px-6 md:px-8 py-3 md:py-5 bg-iron-red text-white text-xs font-black uppercase tracking-[0.3em] rounded-2xl shadow-neon-red hover:bg-red-600 hover:-translate-y-1 transition-all duration-300 active:scale-[0.98]"
          >
            <Plus size={18} strokeWidth={3} />
            Novo Aluno
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-iron-gray rounded-xl p-4 md:p-6 shadow-2xl border border-white/5 mb-6 md:mb-10">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-iron-red transition-colors" size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, CPF ou e-mail do aluno..."
                className="w-full pl-14 md:pl-16 pr-4 md:pr-6 py-3 md:py-5 bg-white/5 border border-white/5 rounded-2xl text-white text-sm font-medium placeholder:text-zinc-700 focus:ring-2 focus:ring-iron-red/20 focus:border-iron-red transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-6 md:px-10 py-3 md:py-5 bg-iron-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-zinc-900 border border-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Filter size={16} />
              Filtrar Lista
            </button>
          </form>
        </div>

        {error && (
          <div className="mb-8 p-6 bg-iron-red/10 border border-iron-red/20 rounded-3xl text-iron-red text-xs font-bold flex items-center gap-4 animate-in fade-in">
            <div className="w-2 h-2 rounded-full bg-iron-red animate-pulse" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 md:py-24 gap-4 bg-iron-gray rounded-3xl border border-white/5 shadow-2xl">
            <div className="w-16 h-16 border-4 border-iron-red/10 border-t-iron-red rounded-full animate-spin" />
            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.4em]">Sincronizando Atletas...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 md:py-24 bg-iron-gray rounded-3xl border border-dashed border-white/10 shadow-2xl">
            <div className="bg-white/5 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
              <Users className="w-10 h-10 text-zinc-800" />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white mb-3">Nenhum aluno encontrado</h3>
            <p className="text-zinc-500 font-medium mb-6 md:mb-10 max-w-xs mx-auto">Sua base de dados parece estar vazia para estes filtros.</p>
            <Link
              href="/admin/alunos/novo"
              className="inline-flex px-6 md:px-10 py-3 md:py-5 bg-iron-red text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-neon-red hover:scale-105 transition-all"
            >
              Adicionar Primeiro Aluno
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-8">
            {rows.map((r) => (
              <div
                key={r.id}
                className="group relative bg-iron-gray rounded-2xl md:rounded-3xl p-5 md:p-8 hover:shadow-2xl transition-all duration-500 border border-white/5 cursor-pointer overflow-hidden flex flex-col h-full"
                onClick={() => router.push(`/admin/aluno/${r.id}`)}
              >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px] -mr-10 -mt-10 group-hover:bg-iron-red/5 transition-colors duration-500" />

                <div className="relative flex-1">
                  <div className="flex justify-between items-start mb-4 md:mb-6">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white/5 rounded-2xl flex items-center justify-center text-zinc-600 group-hover:bg-iron-red/10 group-hover:text-iron-red transition-all duration-500 border border-white/5">
                      <span className="text-xl font-black">
                        {(r.full_name || r.email || "?")[0].toUpperCase()}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-3 translate-x-2">
                       {/* Status Badge Customizada */}
                      <div className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${
                        r.status_pagamento === "pago" 
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : "bg-iron-gold/10 text-iron-gold"
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${r.status_pagamento === "pago" ? "bg-emerald-500" : "bg-iron-gold"} animate-pulse`} />
                        {r.status_pagamento === "pago" ? "ATIVO" : "PENDENTE"}
                      </div>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-lg font-black text-white group-hover:text-iron-red transition-colors mb-1 line-clamp-1 uppercase tracking-tight">
                      {r.full_name || "Sem Nome Identificado"}
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                      <Mail size={12} className="text-zinc-600" />
                      {r.email || "Sem e-mail"}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 py-4 border-y border-white/5 mb-8">
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest mb-1">Adesão em</p>
                      <div className="flex items-center gap-2 text-zinc-300 font-bold text-xs uppercase tracking-tight">
                        <Calendar size={14} className="text-iron-red" />
                        {formatDate(r.created_at)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 relative mt-auto">
                   <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/admin/aluno/${r.id}`);
                    }}
                    className="flex-1 py-3 md:py-5 bg-iron-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-iron-red border border-white/10 transition-all duration-500 flex items-center justify-center gap-3 group/btn hover:shadow-neon-red"
                  >
                    Gerenciar Atleta
                    <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={(e) => handleDelete(e, r.id, r.full_name || r.email || "Aluno")}
                    disabled={deletingId === r.id}
                    className="p-3 md:p-5 bg-white/5 text-zinc-700 hover:bg-iron-red/10 hover:text-iron-red rounded-2xl transition-all duration-300 border border-white/5"
                    title="Arquivar Registro"
                  >
                    {deletingId === r.id ? (
                      <div className="w-5 h-5 border-2 border-iron-red/20 border-t-iron-red rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
