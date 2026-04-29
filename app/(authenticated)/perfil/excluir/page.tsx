// app/(authenticated)/perfil/excluir/page.tsx
// Tela de exclusão de conta (3 passos)
// 1. Confirmação inicial
// 2. Digitar "EXCLUIR" para confirmar
// 3. Chamar Server Action que invoca delete_user_account()

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { deleteAccountAction } from './actions';

export default function ExcluirContaPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [confirmacao, setConfirmacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleConfirmarStep1 = () => {
    setStep(2);
  };

  const handleExcluir = async () => {
    if (confirmacao !== 'EXCLUIR') {
      setErro('Digite "EXCLUIR" para confirmar');
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const result = await deleteAccountAction();

      if (result.success) {
        setStep(3);
        // Redirecionar para login após alguns segundos
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setErro(result.error || 'Erro ao excluir conta. Tente novamente.');
      }
    } catch (err) {
      setErro('Erro ao excluir conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleVoltar = () => {
    router.back();
  };

  return (
    <main className="min-h-screen bg-surface-0 pb-12">
      <ScreenHeader
        title="Excluir conta"
        subtitle="Esta ação é permanente"
      />

      <div className="px-4 py-6">
        {step === 1 && (
          <Card className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Tem certeza que deseja excluir sua conta?
              </h2>
              <p className="text-sm text-text-secondary mb-4">
                Você vai perder:
              </p>
              <ul className="text-sm text-text-secondary space-y-1 mb-4">
                <li>• Seus treinos e histórico</li>
                <li>• Suas medidas e fotos</li>
                <li>• Seus recordes pessoais</li>
                <li>• Todos os seus dados na plataforma</li>
              </ul>
              <p className="text-xs text-text-tertiary">
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={handleVoltar}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={handleConfirmarStep1}
              >
                Continuar
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Confirme sua intenção
              </h2>
              <p className="text-sm text-text-secondary mb-4">
                Para confirmar a exclusão, digite <span className="font-mono bg-surface-2 px-1">EXCLUIR</span> no campo abaixo.
              </p>
            </div>

            <Input
              placeholder="Digite EXCLUIR"
              value={confirmacao}
              onChange={(e) => {
                setConfirmacao(e.target.value.toUpperCase());
                setErro(null);
              }}
              disabled={loading}
              error={erro || undefined}
            />

            {erro && (
              <p className="text-xs text-danger">{erro}</p>
            )}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Voltar
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={handleExcluir}
                loading={loading}
                disabled={confirmacao !== 'EXCLUIR' || loading}
              >
                Excluir permanentemente
              </Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="flex flex-col gap-4 text-center py-8">
            <div className="text-4xl mb-2">✓</div>
            <h2 className="text-lg font-semibold text-text-primary">
              Conta excluída
            </h2>
            <p className="text-sm text-text-secondary">
              Seus dados foram removidos da plataforma.
            </p>
            <p className="text-xs text-text-tertiary mt-2">
              Você será redirecionado em breve...
            </p>
          </Card>
        )}
      </div>
    </main>
  );
}
