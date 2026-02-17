"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface ProfileRow {
  id: string;
  nome: string;
  frequencia_treino: number;
  last_checkin?: string | null;
  status?: string | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [totalAlunos, setTotalAlunos] = useState<number>(0);
  const [checkinsToday, setCheckinsToday] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // total active students (status != 'inadimplente' if field exists)
      const { count: totalCount } = await supabaseClient
        .from("profiles")
        .select("id", { count: "exact" })
        .eq("type", "aluno")
        .neq("status", "inadimplente");

      setTotalAlunos(totalCount || 0);

      // check-ins today: count medidas where date = today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { count: checkins } = await supabaseClient
        .from("medidas")
        .select("id", { count: "exact" })
        .gte("data_medicao", todayStart.toISOString())
        .lte("data_medicao", todayEnd.toISOString());

      setCheckinsToday(checkins || 0);

      // fetch rows (optionally filtered)
      let q = supabaseClient
        .from("profiles")
        .select("id, nome, frequencia_treino, last_checkin, status")
        .eq("type", "aluno")
        .order("frequencia_treino", { ascending: false })
        .limit(200);

      if (query && query.trim().length > 0) {
        q = q.ilike("nome", `%${query}%`);
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

  return (
    <div className="min-h-screen bg-coach-black p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard Coach</h1>
          <p className="text-gray-400">Gerencie seus alunos e acompanhe check-ins</p>
        </header>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="card-glass">
            <h3 className="text-sm text-gray-300">Total de Alunos Ativos</h3>
            <p className="mt-3 text-white text-3xl font-bold">{totalAlunos}</p>
          </div>
          <div className="card-glass">
            <h3 className="text-sm text-gray-300">Check-ins Hoje</h3>
            <p className="mt-3 text-white text-3xl font-bold">{checkinsToday}</p>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6 flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome do aluno"
            className="flex-1 px-4 py-3 bg-coach-gray border border-coach-gold/10 rounded text-white placeholder-gray-400 focus:outline-none"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-linear-to-r from-coach-gold to-coach-gold-dark text-black font-semibold rounded"
          >
            Buscar
          </button>
        </form>

        {error && <div className="mb-4 text-red-400">{error}</div>}

        {/* Table */}
        <div className="card-glass overflow-x-auto p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-coach-gold/10">
                <th className="px-4 py-3 text-sm text-gray-300">Nome do Aluno</th>
                <th className="px-4 py-3 text-sm text-gray-300">Frequência</th>
                <th className="px-4 py-3 text-sm text-gray-300">Último Check-in</th>
                <th className="px-4 py-3 text-sm text-gray-300">Status</th>
                <th className="px-4 py-3 text-sm text-gray-300">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-400">Carregando...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-400">Nenhum aluno encontrado.</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-coach-gold/10">
                    <td className="px-4 py-3 text-white">{r.nome}</td>
                    <td className="px-4 py-3 text-coach-gold font-semibold">{r.frequencia_treino ?? 0}</td>
                    <td className="px-4 py-3 text-gray-300">{r.last_checkin ? new Date(r.last_checkin).toLocaleString('pt-BR') : '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{r.status ?? 'ativo'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/admin/aluno/${r.id}`)}
                        className="px-4 py-2 bg-linear-to-r from-coach-gold to-coach-gold-dark text-black font-semibold rounded"
                      >
                        Gerenciar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
