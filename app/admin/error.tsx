'use client';

import { useEffect } from 'react';
import { Warning, ArrowsClockwise, Users } from '@phosphor-icons/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error in admin route:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:pl-8">
      <div className="max-w-md w-full bg-surface-1 border border-danger-border rounded-2xl p-8 text-center shadow-elev-2">
        <div className="w-16 h-16 bg-danger-subtle border-2 border-danger-border rounded-full flex items-center justify-center mx-auto mb-6">
          <Warning className="w-8 h-8 text-danger" />
        </div>

        <h1 className="text-xl font-semibold text-text-primary mb-2 uppercase tracking-tight">
          Erro no Painel de Controle
        </h1>

        <p className="text-text-secondary text-sm mb-6">
          Ocorreu um erro ao carregar esta página. Tente novamente ou volte para a lista de alunos.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="bg-danger-subtle border border-danger-border rounded-xl p-4 mb-6 text-left">
            <p className="text-danger text-xs font-mono break-all">{error.message}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            onClick={reset}
            leftIcon={<ArrowsClockwise size={16} />}
            fullWidth
          >
            Tentar Novamente
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Users size={16} />}
            fullWidth
            onClick={() => { window.location.href = '/admin/alunos'; }}
          >
            Voltar aos Alunos
          </Button>
        </div>

        <p className="text-text-disabled text-xs mt-6">
          Se o problema persistir, verifique sua conexão ou contate o suporte.
        </p>
      </div>
    </div>
  );
}
