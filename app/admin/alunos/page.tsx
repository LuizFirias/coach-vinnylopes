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
    <div className="min-h-screen bg-black px-6 sm:px-8 lg:px-12 pt-20 lg:pt-10 pb-10 font-sans">
      <div className="max-w-7xl mx-auto lg:pl-28">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black tracking-[0.3em] text-[#D4AF37] uppercase">Gestão de Performance</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">Base de <span className="text-zinc-500">Atletas</span></h1>
          </div>
          
          <Link
            href="/admin/alunos/novo"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#D4AF37] text-black text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all active:scale-[0.98] shadow-lg shadow-[#D4AF37]/10"
          >
            <Plus size={18} strokeWidth={3} />
            Novo Registro
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="mb-10 flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-[#D4AF37] transition-colors" size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Localizar atleta por nome ou e-mail..."
              className="w-full pl-14 pr-6 py-4 bg-[#0F0F0F] border border-[#1a1a1a] rounded-xl text-sm text-white placeholder:text-zinc-800 focus:outline-none focus:border-[#D4AF37]/50 transition-all font-medium"
            />
          </form>
        </div>

        {error && (
          <div className="mb-10 p-5 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl text-[#D4AF37] text-[10px] font-black uppercase tracking-widest flex items-center gap-4">
             <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
             {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6 bg-[#0F0F0F] border border-[#1a1a1a] rounded-2xl">
            <div className="w-10 h-10 border-4 border-[#D4AF37]/10 border-t-[#D4AF37] rounded-full animate-spin" />
            <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.4em]">Sincronizando Base...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-32 bg-[#0F0F0F] border border-dashed border-[#1a1a1a] rounded-2xl">
            <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Nenhum atleta localizado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {rows.map((r) => (
              <div
                key={r.id}
                className="group bg-[#0F0F0F] border border-[#1a1a1a] hover:border-[#D4AF37]/30 p-5 rounded-2xl transition-all cursor-pointer flex items-center justify-between"
                onClick={() => router.push(`/admin/aluno/${r.id}`)}
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-zinc-700 font-black border border-[#1a1a1a] transition-all group-hover:text-[#D4AF37] group-hover:border-[#D4AF37]/20 text-lg">
                    {(r.full_name || r.email || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-[#D4AF37] transition-colors leading-tight">
                      {r.full_name || "Sem Nome"}
                    </h3>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">{r.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-10">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[9px] font-black text-zinc-700 uppercase tracking-tighter mb-1">Status</span>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                      r.status_pagamento === 'pago' ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 
                      'bg-zinc-800 text-zinc-500'
                    }`}>
                      {r.status_pagamento === "pago" ? "Ativo" : "Pendente"}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-black border border-[#1a1a1a] flex items-center justify-center text-zinc-800 group-hover:text-white group-hover:bg-[#D4AF37] group-hover:border-transparent transition-all">
                    <ChevronRight size={18} strokeWidth={3} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
