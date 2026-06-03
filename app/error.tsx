'use client';

import { useEffect } from 'react';
import { Warning, ArrowsClockwise, House } from '@phosphor-icons/react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error caught by error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-surface-1 border border-danger/20 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-danger-subtle border border-danger-border rounded-full flex items-center justify-center mx-auto mb-6">
            <Warning className="w-8 h-8 text-danger" />
          </div>

          <h1 className="text-2xl text-text-primary mb-2 uppercase tracking-tight">
            Algo deu errado
          </h1>

          <p className="text-text-secondary text-sm mb-8">
            Ocorreu um erro inesperado. Você pode tentar novamente ou voltar para a página inicial.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="bg-danger-subtle border border-danger-border rounded-lg p-4 mb-6 text-left">
              <p className="text-danger text-xs font-mono break-all">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 w-full h-12 bg-brand text-text-on-brand rounded-xl uppercase tracking-widest text-xs hover:opacity-90 transition-all active:scale-95"
            >
              <ArrowsClockwise size={16} />
              Tentar Novamente
            </button>

            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full h-12 bg-surface-2 border border-border-default text-text-secondary rounded-xl uppercase tracking-widest text-xs hover:text-text-primary hover:border-border-strong transition-all active:scale-95"
            >
              <House size={16} />
              Voltar para Home
            </Link>
          </div>

          <p className="text-text-disabled text-xs mt-6">
            Se o problema persistir, entre em contato com o suporte.
          </p>
        </div>
      </div>
    </div>
  );
}
