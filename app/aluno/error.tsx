'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

export default function AlunoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error in aluno route:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 lg:pl-28">
      <div className="max-w-md w-full">
        <div className="bg-[#0F0F0F] border border-red-900/50 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-900/20 border-2 border-red-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>

          <h1 className="text-2xl text-white mb-2 uppercase tracking-tight">
            Erro na Página
          </h1>

          <p className="text-zinc-400 text-sm mb-8">
            Ocorreu um erro ao carregar esta página. Tente novamente ou volte para o dashboard.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="bg-red-950/30 border border-red-900 rounded-lg p-4 mb-6 text-left">
              <p className="text-red-400 text-xs font-mono break-all">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 w-full h-12 bg-iron-gold text-black rounded-xl uppercase tracking-widest text-xs hover:bg-white transition-all active:scale-95"
            >
              <RefreshCw size={16} />
              Tentar Novamente
            </button>

            <Link
              href="/aluno/dashboard"
              className="flex items-center justify-center gap-2 w-full h-12 bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-400 rounded-xl uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all active:scale-95"
            >
              <LayoutDashboard size={16} />
              Voltar ao Dashboard
            </Link>
          </div>

          <p className="text-zinc-600 text-xs mt-6">
            Se o problema persistir, contate seu coach.
          </p>
        </div>
      </div>
    </div>
  );
}
