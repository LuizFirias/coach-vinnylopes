"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.[0]) {
    return (
      <div className="bg-coach-black/90 border border-coach-gold/30 rounded-lg p-2 text-xs text-white">
        <p>{`Peso: ${payload[0].value} kg`}</p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [name, setName] = useState<string>("Aluno");
  const [loading, setLoading] = useState(true);
  const [planExpiry, setPlanExpiry] = useState<string | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [lastTreino, setLastTreino] = useState<string | null>(null);
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [rankingPos, setRankingPos] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusPagamento, setStatusPagamento] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

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

        // Get profile info
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("full_name, data_expiracao, status_pagamento")
          .eq("id", userId)
          .single();

        const displayName = profile?.full_name || user.email?.split("@")[0] || "Aluno";
        setName(displayName);

        setStatusPagamento(profile?.status_pagamento || "pendente");

        // Check if subscription is active
        if (profile?.data_expiracao) {
          setPlanExpiry(profile.data_expiracao);
          const exp = new Date(profile.data_expiracao);
          const now = new Date();
          const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          setDaysLeft(diff);

          // Block if expired or payment pending
          if (diff < 0 || profile.status_pagamento === "atrasado") {
            setIsBlocked(true);
            setLoading(false);
            return;
          }
        }

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
          .select("id, ultimo_checkin")
          .eq("role", "aluno")
          .order("ultimo_checkin", { ascending: false, nullsFirst: false });

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

  const dadosGrafico = medidas.map((m) => ({
    data: new Date(m.data_medicao).toLocaleDateString("pt-BR"),
    peso: m.peso,
  }));

  // Paywall screen
  if (isBlocked) {
    return (
      <div className="min-h-[calc(100vh-4rem)] lg:min-h-screen bg-coach-black flex items-center justify-center px-4 py-12">
        <div className="max-w-sm w-full">
          <div className="card-glass p-6 sm:p-8 text-center">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3 tracking-tight">
              Sua assinatura precisa de renovação
            </h2>
            <p className="text-sm text-gray-300 mb-6 leading-relaxed">
              Entre em contato com o coach para renovar seu plano e continuar com acesso.
            </p>
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gradient inline-block"
            >
              Falar com Coach no WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-coach-black px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 pb-12">
      <div className="max-w-5xl mx-auto">
        {/* Welcome header */}
        <div className="mb-8">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-white/95 tracking-tight">
            Olá, {name}!
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 tracking-wide uppercase">
            Pronto para o treino de hoje?
          </p>
        </div>

        {/* Plan expiry */}
        {planExpiry && (
          <div className="mb-6 card-glass p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-gray-300 uppercase tracking-wide">Acesso VIP até</span>
              <span className={`text-sm sm:text-base font-semibold ${
                daysLeft !== null && daysLeft < 5 ? 'text-coach-gold' : 'text-white'
              }`}>
                {new Date(planExpiry).toLocaleDateString("pt-BR")}
              </span>
            </div>
            {daysLeft !== null && (
              <p className={`text-xs mt-2 ${
                daysLeft < 5 ? 'text-coach-gold/80' : 'text-gray-400'
              }`}>
                {daysLeft >= 0 ? `${daysLeft} dias restantes` : "Expirado"}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 card-glass p-4 border-red-500/30 bg-red-900/10">
            <p className="text-sm text-red-400/90">{error}</p>
          </div>
        )}

        {/* Top cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="card-glass p-4">
            <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-semibold">Último Treino</h3>
            <p className="text-sm sm:text-base text-white/90 truncate">
              {lastTreino || "Nenhum treino"}
            </p>
          </div>

          <div className="card-glass p-4">
            <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-semibold">Evolução</h3>
            <p className="text-sm sm:text-base text-white/90 font-medium">
              {pesoAtual != null ? `${pesoAtual} kg` : "—"}
            </p>
            {variacao != null && (
              <p className={`text-xs mt-2 ${
                parseFloat(variacao) < 0 ? 'text-green-400/80' : 'text-gray-400'
              }`}>
                Variação: {parseFloat(variacao) > 0 ? '+' : ''}{variacao} kg
              </p>
            )}
          </div>

          <div className="card-glass p-4">
            <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-semibold">Ranking</h3>
            <p className="text-sm sm:text-base text-white/90 font-medium">
              {rankingPos != null ? `#${rankingPos}` : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-2">Posição em frequência</p>
          </div>
        </div>

        {/* Chart */}
        {dadosGrafico.length > 1 && (
          <div className="card-glass p-4 sm:p-6">
            <h2 className="text-sm sm:text-base font-semibold text-white mb-4 uppercase tracking-widest">
              Evolução do Peso
            </h2>
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosGrafico}>
                  <defs>
                    <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="data" stroke="#888888" style={{ fontSize: "11px" }} />
                  <YAxis stroke="#888888" style={{ fontSize: "11px" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="peso"
                    stroke="#D4AF37"
                    strokeWidth={2}
                    fill="url(#colorPeso)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
