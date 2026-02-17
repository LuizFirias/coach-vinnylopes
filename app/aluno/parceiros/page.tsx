'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';

interface Parceiro {
  id: string;
  nome_marca: string;
  descricao: string;
  cupom: string;
  link_site: string;
  url_logo: string;
  verificado: boolean;
}

export default function ParceirosPage() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCupom, setCopiedCupom] = useState<string | null>(null);

  useEffect(() => {
    const fetchParceiros = async () => {
      try {
        const { data, error: fetchError } = await supabaseClient
          .from('parceiros')
          .select('*')
          .order('nome_marca', { ascending: true });

        if (fetchError) {
          setError('Erro ao carregar parceiros: ' + fetchError.message);
          setLoading(false);
          return;
        }

        setParceiros(data || []);
        setLoading(false);
      } catch (err) {
        setError('Erro ao conectar com o servidor');
        setLoading(false);
      }
    };

    fetchParceiros();
  }, []);

  const handleCopiarCupom = (cupom: string) => {
    navigator.clipboard.writeText(cupom);
    setCopiedCupom(cupom);

    setTimeout(() => {
      setCopiedCupom(null);
    }, 2000);
  };

  const handleIrParaSite = (url: string) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-coach-black p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Parceiros Exclusivos</h1>
          <p className="text-gray-400">
            Descontos especiais para alunos Coach Vinny
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <svg
                className="w-12 h-12 animate-spin text-coach-gold mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-gray-400">Carregando parceiros...</p>
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
        {!loading && !error && parceiros.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center max-w-md">
              <svg
                className="w-20 h-20 mx-auto mb-6 text-coach-gray"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.5m0 0H9m0 0H3.5m0 0H1m5.5 0a2.121 2.121 0 00-3 3m7-7a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h2 className="text-2xl font-semibold text-white mb-3">
                Nenhum parceiro cadastrado
              </h2>
              <p className="text-gray-400">
                Em breve adicionaremos as melhores marcas e serviços exclusivos para você!
              </p>
            </div>
          </div>
        )}

        {/* Parceiros Grid */}
        {!loading && !error && parceiros.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parceiros.map((parceiro) => (
              <div
                key={parceiro.id}
                className="group card-glass overflow-hidden transition-all duration-300 hover:shadow-lg"
              >
                {/* Logo Section */}
                <div className="relative h-48 bg-coach-black flex items-center justify-center overflow-hidden">
                  {parceiro.url_logo && (
                    <img
                      src={parceiro.url_logo}
                      alt={parceiro.nome_marca}
                      className="max-w-full max-h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-500 p-4"
                    />
                  )}

                  {/* Selo de Verificado */}
                  {parceiro.verificado && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 bg-linear-to-r from-coach-gold to-coach-gold-dark px-3 py-1 rounded-full text-black text-xs font-semibold">
                      ✓ VERIFICADO
                    </div>
                  )}
                </div>

                {/* Content Section */}
                  <div className="p-6">
                  {/* Nome da Marca */}
                  <h3 className="text-xl font-bold text-white mb-2">
                    {parceiro.nome_marca}
                  </h3>

                  {/* Descrição */}
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {parceiro.descricao}
                  </p>

                  {/* Cupom em Destaque */}
                  <div className="mb-6 p-4 card-glass cursor-pointer" onClick={() => handleCopiarCupom(parceiro.cupom)}>
                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-widest">
                      Cupom de Desconto
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-coach-gold">
                        {parceiro.cupom}
                      </p>
                      <svg
                        className="w-5 h-5 text-coach-gold"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    {copiedCupom === parceiro.cupom && (
                      <p className="text-xs text-green-400 mt-2">✓ Copiado!</p>
                    )}
                  </div>

                  {/* Botão IR PARA O SITE */}
                  <button
                    onClick={() => handleIrParaSite(parceiro.link_site)}
                    className="w-full py-3 font-semibold text-black rounded bg-linear-to-r from-coach-gold to-coach-gold-dark hover:from-coach-gold-dark hover:to-coach-gold transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    IR PARA O SITE
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        {!loading && !error && parceiros.length > 0 && (
          <div className="mt-12 card-glass text-center">
            <p className="text-gray-300">
              <span className="text-coach-gold font-semibold">💝 Aproveite!</span>
              {' '}Todos esses parceiros oferecem descontos exclusivos para alunos Coach Vinny
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
