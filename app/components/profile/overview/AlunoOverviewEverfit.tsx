'use client';

import { TrainingOverviewCard, type SessaoRecente } from './TrainingOverviewCard';
import { BodyMetricsOverviewCard } from './BodyMetricsOverviewCard';
import { GoalCountdownCard } from './GoalCountdownCard';
import { ProgressPhotosOverviewCard } from './ProgressPhotosOverviewCard';
import { ProfileInfoCard } from './ProfileInfoCard';
import { UpdatesFeedCard } from './UpdatesFeedCard';
import { AlunoObservacoesCard } from '@/app/components/admin/alunos/AlunoObservacoesCard';

interface Foto {
  id: string;
  posicao: string;
  url_foto: string;
  data_upload: string;
}

interface PlanoFinanceiroHistoricoLite {
  id: string;
  data_pagamento?: string | null;
  registrado_em: string;
  valor_plano: number;
  status_pagamento: string;
}

interface AlunoOverviewEverfitProps {
  alunoId: string;
  alunoNome: string;
  alunoAvatarUrl: string | null;
  alunoSexo?: 'masculino' | 'feminino' | 'outro' | null;
  coachId: string | null;
  legacyOrientacoes?: string | null;
  historicoTreinos: {
    data_conclusao?: string | null;
    dados_sessao?: {
      nome_rotina?: string;
      nome_exercicio?: string;
      series?: { completado?: boolean; peso_atual?: number; reps?: number }[];
    } | null;
  }[];
  sessoesRecentes: SessaoRecente[];
  fichasAtivasCount: number;
  medidas: { id: string; data_medicao: string; peso: number | null }[];
  fotos: Foto[];
  historicoFinanceiro: PlanoFinanceiroHistoricoLite[];
  onOpenTreinos: () => void;
  onOpenEvolucao: () => void;
  onOpenFotos: () => void;
}

/**
 * Grid 3 colunas da aba Visão Geral — só desktop (o caller já cuida do
 * `hidden lg:block`). Estilo Everfit: cabeçalhos em faixa cinza, pouca
 * sombra externa, cards encaixados pra evitar scroll da página.
 */
export function AlunoOverviewEverfit({
  alunoId,
  alunoNome,
  alunoAvatarUrl,
  alunoSexo,
  coachId,
  legacyOrientacoes,
  historicoTreinos,
  sessoesRecentes,
  fichasAtivasCount,
  medidas,
  fotos,
  historicoFinanceiro,
  onOpenTreinos,
  onOpenEvolucao,
  onOpenFotos,
}: AlunoOverviewEverfitProps) {
  return (
    <div className="grid grid-cols-12 gap-4 items-start">
      {/* Coluna 1 — maior */}
      <div className="col-span-6 flex flex-col gap-4">
        <TrainingOverviewCard
          historicoTreinos={historicoTreinos}
          sessoesRecentes={sessoesRecentes}
          fichasAtivasCount={fichasAtivasCount}
          onOpenTreinos={onOpenTreinos}
        />
        <BodyMetricsOverviewCard
          alunoId={alunoId}
          medidas={medidas}
          historicoTreinos={historicoTreinos}
          onUpdateAll={onOpenEvolucao}
        />
      </div>

      {/* Coluna 2 */}
      <div className="col-span-3 flex flex-col gap-4">
        <GoalCountdownCard alunoId={alunoId} coachId={coachId} />
        <AlunoObservacoesCard
          alunoId={alunoId}
          coachId={coachId}
          legacyOrientacoes={legacyOrientacoes}
          tipo="nota"
          panelHeader
          previewLimit={1}
        />
        <AlunoObservacoesCard alunoId={alunoId} coachId={coachId} tipo="lesao" panelHeader previewLimit={2} />
        <ProgressPhotosOverviewCard fotos={fotos} onViewAll={onOpenFotos} onCompare={onOpenFotos} />
      </div>

      {/* Coluna 3 */}
      <div className="col-span-3 flex flex-col gap-4">
        <ProfileInfoCard />
        <UpdatesFeedCard
          alunoId={alunoId}
          alunoNome={alunoNome}
          alunoAvatarUrl={alunoAvatarUrl}
          alunoSexo={alunoSexo}
          historicoTreinos={historicoTreinos}
          medidas={medidas}
          fotos={fotos}
          historicoFinanceiro={historicoFinanceiro}
        />
      </div>
    </div>
  );
}
