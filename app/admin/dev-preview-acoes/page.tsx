'use client';

/**
 * Preview temporário, só pra visualizar como "Ações requeridas" se comporta
 * com muitos alunos — dados 100% fake, não bate no Supabase. Não tem link em
 * nenhum menu; acesse direto por /admin/dev-preview-acoes. Apagar depois de
 * decidir o ajuste do card.
 */

import { useState } from 'react';
import { DashboardKpiRow } from '@/app/components/dashboard/coach/DashboardKpiRow';
import { MrrChartCard } from '@/app/components/dashboard/coach/MrrChartCard';
import { PlanDistributionCard } from '@/app/components/dashboard/coach/PlanDistributionCard';
import { PriorityActionsCard, type PriorityAction } from '@/app/components/dashboard/coach/PriorityActionsCard';
import { RecentActivityFeed } from '@/app/components/dashboard/coach/RecentActivityFeed';
import { AtalhosRapidos } from '@/app/components/dashboard/coach/AtalhosRapidos';
import { ProximaAulaCard } from '@/app/components/dashboard/coach/ProximaAulaCard';

const NOMES = [
  'João Pereira', 'Maria Souza', 'Carlos Lima', 'Ana Ferreira', 'Pedro Santos',
  'Juliana Costa', 'Rafael Alves', 'Camila Rocha', 'Bruno Dias', 'Fernanda Melo',
  'Lucas Barbosa', 'Patrícia Nunes',
];

const TIPOS: PriorityAction['tipo'][] = ['danger', 'warning', 'info'];
const DESCRICOES: { tipo: PriorityAction['tipo']; descricao: string; acao: string }[] = [
  { tipo: 'danger', descricao: 'Plano Expirado', acao: 'Cobrar' },
  { tipo: 'danger', descricao: 'Sem treinar há 12 dias', acao: 'Enviar Mensagem' },
  { tipo: 'warning', descricao: 'Plano vence em 3 dias', acao: 'Renovar' },
  { tipo: 'warning', descricao: 'Adesão à dieta baixa: 42%', acao: 'Ver Plano' },
  { tipo: 'warning', descricao: 'Fotos desatualizadas (há 20 dias)', acao: 'Solicitar Renovação' },
  { tipo: 'info', descricao: 'Nenhum treino realizado ainda', acao: 'Prescrever' },
  { tipo: 'info', descricao: 'Sem plano de nutrição digital', acao: 'Criar Plano' },
];

/** ~10 alunos, cada um com 1 a 4 ações — pra simular o card cheio. */
function buildMockActions(): PriorityAction[] {
  const actions: PriorityAction[] = [];
  NOMES.forEach((nome, i) => {
    const alunoId = `mock-${i}`;
    const qtd = 1 + (i % 4); // varia 1..4 ações por aluno
    for (let j = 0; j < qtd; j++) {
      const d = DESCRICOES[(i + j) % DESCRICOES.length];
      actions.push({
        id: `mock-${i}-${j}`,
        aluno_id: alunoId,
        nome,
        tipo: d.tipo,
        descricao: d.descricao,
        acao: d.acao,
        link: '#',
      });
    }
  });
  return actions;
}

const MOCK_ACTIONS = buildMockActions();
const MOCK_CHART = Array.from({ length: 12 }, (_, i) => ({
  mes: new Date(2026, i, 1).toLocaleDateString('pt-BR', { month: 'short' }),
  receita: 3000 + i * 400,
  futuro: i > 7,
}));
const MOCK_PLANS = [
  { name: 'Mensal', count: 5 },
  { name: 'Trimestral', count: 3 },
  { name: 'Anual', count: 2 },
  { name: 'Outros', count: 2 },
];

export default function DevPreviewAcoesPage() {
  const [layout, setLayout] = useState<'mobile' | 'desktop'>('mobile');

  return (
    <div className="min-h-screen bg-surface-0 px-4 pb-24 pt-6 text-text-primary md:px-8">
      <div className="mx-auto mb-6 flex max-w-[min(1600px,96vw)] items-center gap-3 rounded-xl border border-warning-border bg-warning-subtle px-4 py-3">
        <p className="text-xs font-medium text-warning">
          Preview temporário com dados fake ({MOCK_ACTIONS.length} ações em {NOMES.length} alunos) — não é dado real.
        </p>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => setLayout('mobile')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${layout === 'mobile' ? 'bg-brand text-text-on-brand' : 'bg-surface-1 text-text-secondary'}`}
          >
            Ver como mobile
          </button>
          <button
            type="button"
            onClick={() => setLayout('desktop')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${layout === 'desktop' ? 'bg-brand text-text-on-brand' : 'bg-surface-1 text-text-secondary'}`}
          >
            Ver como desktop
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[min(1600px,96vw)]">
        {layout === 'mobile' ? (
          <div className="mx-auto flex max-w-[420px] flex-col gap-6">
            <PriorityActionsCard actions={MOCK_ACTIONS} />
            <DashboardKpiRow
              activeStudents={12}
              mrr={4820}
              studentsAtRisk={3}
              pendingCheckIns={5}
              activeStudentsSubtitle="Perfis pagantes vigentes"
              compact
            />
            <MrrChartCard currentMrr={4820} chartData={MOCK_CHART} />
            <PlanDistributionCard plans={MOCK_PLANS} totalStudents={12} collapsed />
            <RecentActivityFeed activities={[]} limit={3} showViewAll />
          </div>
        ) : (
          <div className="grid grid-cols-2 items-start gap-6">
            <div className="flex min-w-0 flex-col gap-6">
              <ProximaAulaCard aula={null} />
              <PriorityActionsCard actions={MOCK_ACTIONS} />
              <RecentActivityFeed activities={[]} />
              <AtalhosRapidos compact />
            </div>
            <div className="flex min-w-0 flex-col gap-6">
              <DashboardKpiRow
                title="Meu Negócio"
                activeStudents={12}
                mrr={4820}
                studentsAtRisk={3}
                pendingCheckIns={5}
                activeStudentsSubtitle="Perfis pagantes vigentes"
                compact
              />
              <MrrChartCard currentMrr={4820} chartData={MOCK_CHART} />
              <PlanDistributionCard plans={MOCK_PLANS} totalStudents={12} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
