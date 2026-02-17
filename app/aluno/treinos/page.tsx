'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';

interface Treino {
  id: string;
  nome_arquivo: string;
  url_pdf: string;
  data_upload: string;
}

export default function AlunoTreinosPage() {
  const [treinos, setTreinos] = useState<Treino[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const fetchTreinos = async () => {
      try {
        // Obter usuário logado
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !authData.user) {
          setError('Você precisa estar logado para ver seus treinos');
          setLoading(false);
          return;
        }

        const userId = authData.user.id;
        setUserName(authData.user.email?.split('@')[0] || 'Aluno');

        // Buscar treinos do aluno
        const { data: treinosData, error: treinosError } = await supabaseClient
          .from('treinos_alunos')
          .select('id, nome_arquivo, url_pdf, data_upload')
          .eq('aluno_id', userId)
          .order('data_upload', { ascending: false });

        if (treinosError) {
          setError('Erro ao carregar seus treinos: ' + treinosError.message);
          setLoading(false);
          return;
        }

        setTreinos(treinosData || []);
        setLoading(false);
      } catch (err) {
        setError('Erro ao conectar com o servidor');
        setLoading(false);
      }
    };

    fetchTreinos();
  }, []);

  const formatarData = (dataString: string) => {
    try {
      const data = new Date(dataString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(data);
    } catch {
      return dataString;
    }
  };

  const handleVisualizarPDF = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-coach-black p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Meus Treinos</h1>
          <p className="text-gray-400">Visualize e baixe seus treinos personalizados</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <svg className="w-12 h-12 animate-spin text-coach-gold mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-400">Carregando seus treinos...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-6 bg-red-900/20 border border-red-700 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && treinos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center max-w-md">
              <svg className="w-20 h-20 mx-auto mb-6 text-coach-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-2xl font-semibold text-white mb-3">Nenhum treino ainda</h2>
              <p className="text-gray-400 mb-8">
                Seu coach em breve compartilhará seus treinos personalizados aqui. Fique atento!
              </p>
              <div className="inline-block px-6 py-3 bg-linear-to-r from-coach-gold to-coach-gold-dark text-black font-semibold rounded">
                ⭐ Bem-vindo à Plataforma Coach Vinny
              </div>
            </div>
          </div>
        )}

        {/* Treinos Grid */}
        {!loading && !error && treinos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {treinos.map((treino) => (
              <div key={treino.id} className="group bg-coach-gray rounded-lg overflow-hidden border border-coach-gold/20 hover:border-coach-gold/50 transition-all duration-300 hover:shadow-lg hover:shadow-coach-gold/10">
                {/* Card Header */}
                <div className="p-6 border-b border-coach-gold/20">
                  <div className="flex items-start gap-3 mb-4">
                    <svg className="w-6 h-6 text-coach-gold shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {treino.nome_arquivo.replace('.pdf', '')}
                      </h3>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatarData(treino.data_upload)}
                  </p>
                </div>

                {/* Card Footer - Button */}
                <div className="p-4">
                  <button
                    onClick={() => handleVisualizarPDF(treino.url_pdf)}
                    className="w-full py-3 font-semibold text-black rounded bg-linear-to-r from-coach-gold to-coach-gold-dark hover:from-coach-gold-dark hover:to-coach-gold transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4m-4-4l-4 4m0 0l-4-4m4 4V3" />
                    </svg>
                    Visualizar PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Footer */}
        {!loading && !error && treinos.length > 0 && (
          <div className="mt-12 p-6 bg-coach-gray rounded-lg border border-coach-gold/20">
            <p className="text-center text-gray-300">
              <span className="text-coach-gold font-semibold text-lg">{treinos.length}</span>
              <span className="ml-2">{treinos.length === 1 ? 'treino foi' : 'treinos foram'} compartilhados com você</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
