'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';

export default function RelatoriosPage() {
  const [totalAlunos, setTotalAlunos] = useState(0);
  const [ativos, setAtivos] = useState(0);
  const [inadimplentes, setInadimplentes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelatorios = async () => {
      setLoading(true);
      setError(null);
      try {
        const { count: totalCount } = await supabaseClient
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('role', 'aluno');

        const { count: ativosCount } = await supabaseClient
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('role', 'aluno')
          .eq('status_pagamento', 'pago');

        const { count: inadimplenteCount } = await supabaseClient
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('role', 'aluno')
          .neq('status_pagamento', 'pago');

        setTotalAlunos(totalCount || 0);
        setAtivos(ativosCount || 0);
        setInadimplentes(inadimplenteCount || 0);
      } catch (err: any) {
        setError(err?.message || 'Erro ao carregar relatorios');
      } finally {
        setLoading(false);
      }
    };

    fetchRelatorios();
  }, []);

  return (
    <div className="min-h-screen bg-coach-black p-8 pt-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Relatorios Financeiros</h1>
          <p className="text-gray-400">Visao geral de alunos e desempenho.</p>
        </div>

        {error && <div className="mb-4 text-red-400">{error}</div>}

        {loading ? (
          <div className="card-glass text-gray-300">Carregando...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="card-glass">
                <p className="text-gray-400 text-sm">Total de Alunos</p>
                <p className="text-white text-3xl font-bold mt-2">{totalAlunos}</p>
              </div>
              <div className="card-glass">
                <p className="text-gray-400 text-sm">Ativos</p>
                <p className="text-white text-3xl font-bold mt-2">{ativos}</p>
              </div>
              <div className="card-glass">
                <p className="text-gray-400 text-sm">Inativos</p>
                <p className="text-white text-3xl font-bold mt-2">{inadimplentes}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card-glass">
                <p className="text-gray-400 text-sm">Receita Total</p>
                <p className="text-white text-3xl font-bold mt-2">—</p>
                <p className="text-gray-500 text-xs mt-2">Configure um valor de plano para calcular receita.</p>
              </div>
              <div className="card-glass">
                <p className="text-gray-400 text-sm">Planos Mais Vendidos</p>
                <div className="text-gray-500 text-sm mt-3">Sem dados suficientes.</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
