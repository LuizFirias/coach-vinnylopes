"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Medida {
  id: string;
  peso: number;
  data_medicao: string;
}

export default function DashboardPage() {
  const [name, setName] = useState<string>("Aluno");
  const [loading, setLoading] = useState(true);
  const [lastTreino, setLastTreino] = useState<string | null>(null);
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [rankingPos, setRankingPos] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: authData } = await supabaseClient.auth.getUser();
        const user = authData?.user;
        if (!user) {
          setError("Usuário não autenticado");
          setLoading(false);
          return;
        }

        const userId = user.id;

        // Get profile name
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("nome")
          .eq("id", userId)
          .single();

        if (profile?.nome) setName(profile.nome);

        // Last treino PDF
        const { data: lastTreinoData } = await supabaseClient
          .from("treinos_alunos")
          .select("nome_arquivo")
          .eq("aluno_id", userId)
          .order("data_upload", { ascending: false })
          .limit(1)
          .single();

        if (lastTreinoData?.nome_arquivo) setLastTreino(lastTreinoData.nome_arquivo);

        // Medidas (peso)
        const { data: medidasData } = await supabaseClient
          .from("medidas")
          .select("id, peso, data_medicao")
          .eq("user_id", userId)
          .order("data_medicao", { ascending: true });

        setMedidas((medidasData as Medida[]) || []);

        // Ranking position
        const { data: allProfiles } = await supabaseClient
          .from("profiles")
          .select("id, frequencia_treino")
          .eq("type", "aluno")
          .order("frequencia_treino", { ascending: false });

        if (allProfiles) {
          const idx = (allProfiles as any[]).findIndex((p) => p.id === userId);
          setRankingPos(idx >= 0 ? idx + 1 : null);
        }
      } catch (err: any) {
        setError("Erro ao carregar dashboard: " + (err.message || String(err)));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const pesoAtual = medidas.length ? medidas[medidas.length - 1].peso : null;
  const pesoAnterior = medidas.length > 1 ? medidas[medidas.length - 2].peso : null;
  const variacao = pesoAtual != null && pesoAnterior != null ? (pesoAtual - pesoAnterior).toFixed(1) : null;

  const dadosGrafico = medidas.map((m) => ({ data: new Date(m.data_medicao).toLocaleDateString("pt-BR"), peso: m.peso }));

  return (
    <div className="min-h-screen bg-coach-black p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">Olá, {name}! Pronto para o treino de hoje?</h1>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400">{error}</div>
        )}

        {/* Top cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="backdrop-blur bg-coach-gray/30 border border-coach-gold/10 rounded-lg p-6">
            <h3 className="text-sm text-gray-300">Último Treino</h3>
            <p className="mt-3 text-white font-semibold">{lastTreino ?? 'Nenhum treino recebido'}</p>
          </div>

          <div className="backdrop-blur bg-coach-gray/30 border border-coach-gold/10 rounded-lg p-6">
            <h3 className="text-sm text-gray-300">Evolução</h3>
            <p className="mt-3 text-white font-semibold">{pesoAtual != null ? `${pesoAtual} kg` : '—'}</p>
            <p className="text-sm mt-1 text-gray-400">{variacao != null ? `Variação: ${variacao} kg` : 'Sem variação'}</p>
          </div>

          <div className="backdrop-blur bg-coach-gray/30 border border-coach-gold/10 rounded-lg p-6">
            <h3 className="text-sm text-gray-300">Ranking</h3>
            <p className="mt-3 text-white font-semibold">{rankingPos != null ? `#${rankingPos}` : '—'}</p>
            <p className="text-sm mt-1 text-gray-400">Posição com base na frequência</p>
          </div>
        </div>

        {/* Gráfico resumido */}
        <div className="bg-coach-gray rounded-lg p-6 border border-coach-gold/10">
          <h2 className="text-lg font-semibold text-white mb-4">Evolução do Peso</h2>
          {dadosGrafico.length > 1 ? (
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosGrafico}>
                  <CartesianGrid stroke="#222" strokeDasharray="3 3" />
                  <XAxis dataKey="data" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #D4AF37' }} />
                  <Line type="monotone" dataKey="peso" stroke="#D4AF37" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-400">Mais de uma medição necessária para visualizar o gráfico.</p>
          )}
        </div>
      </div>
    </div>
  );
}
