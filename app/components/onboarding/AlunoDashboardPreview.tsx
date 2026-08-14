"use client";

import { useMemo, useState } from "react";
import { HeroHeader } from "@/app/components/dashboard/home/HeroHeader";
import { WorkoutCard } from "@/app/components/dashboard/home/WorkoutCard";
import { WeekCalendar } from "@/app/components/dashboard/home/WeekCalendar";
import { StreakRow } from "@/app/components/dashboard/home/StreakRow";
import { NutritionCard } from "@/app/components/dashboard/home/NutritionCard";
import { HydrationCard } from "@/app/components/dashboard/home/HydrationCard";
import { QuickActions } from "@/app/components/dashboard/home/QuickActions";
import {
  buildPreviewDiasSemana,
  DADOS_PREVIEW_ALUNO,
} from "@/lib/onboarding/dadosPreviewAluno";
import { getTodayBrazil } from "@/lib/dateUtils";

/**
 * Réplica visual da dashboard do aluno, com dados fictícios (João).
 * Links internos são bloqueados — é só demonstração para o coach.
 */
export function AlunoDashboardPreview() {
  const d = DADOS_PREVIEW_ALUNO;
  const today = getTodayBrazil();
  const diasSemana = useMemo(() => buildPreviewDiasSemana(16), []);
  const [selectedDia, setSelectedDia] = useState(
    () => diasSemana.find((dia) => dia.isHoje) ?? diasSemana[1] ?? null,
  );
  const [aguaCopos, setAguaCopos] = useState(d.agua.copos);

  return (
    <div
      className="dashboard-aluno min-h-screen scroll-content overflow-y-auto"
      onClickCapture={(e) => {
        const target = e.target as HTMLElement | null;
        const anchor = target?.closest?.("a");
        if (anchor) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <div className="mx-auto flex max-w-md flex-col gap-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <div className="relative">
          <HeroHeader
            userName={d.nome}
            avatarUrl={null}
            showNotificationBadge={false}
            chatNaoLidas={0}
            onNotificationsClick={() => undefined}
            agua={{ atual: aguaCopos, meta: d.agua.metaCopos }}
            dieta={{
              atual: d.nutricao.refeicoesFeitasHoje,
              meta: d.nutricao.totalRefeicoes,
            }}
            treinos={d.hero.treinos}
            cardio={d.hero.cardio}
          />

          <WorkoutCard
            status={d.treinoHoje.status}
            nome={d.treinoHoje.nome}
            qtdExercicios={d.treinoHoje.qtdExercicios}
            checkinPontos={d.treinoHoje.checkinPontos}
          />
        </div>

        <WeekCalendar
          diasSemana={diasSemana}
          today={today}
          selectedDia={selectedDia}
          onSelectDia={setSelectedDia}
          onEditDay={() => undefined}
        />

        <StreakRow
          sequenciaDias={d.streak.sequenciaDias}
          treinosSemana={d.streak.treinosSemana}
          metaSemana={d.streak.metaSemana}
        />

        <div className="mx-4 flex flex-col gap-3">
          <NutritionCard
            nome={d.nutricao.nome}
            refeicoesFeitasHoje={d.nutricao.refeicoesFeitasHoje}
            totalRefeicoes={d.nutricao.totalRefeicoes}
            proximaRefeicao={d.nutricao.proximaRefeicao}
            onVerPlano={() => undefined}
          />

          <HydrationCard
            copos={aguaCopos}
            mlPorCopo={d.agua.mlPorCopo}
            metaCopos={d.agua.metaCopos}
            saving={false}
            onToggleCup={(index) => {
              setAguaCopos((prev) => (index < prev ? index : index + 1));
            }}
          />

          <QuickActions />
        </div>
      </div>
    </div>
  );
}
