"use client";

import { BackButton } from "@/app/components/ui/BackButton";

export function WorkoutCalendarHeader() {
  return (
    <header className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-surface-0 border-b border-surface-2 lg:mx-0 lg:px-0 lg:static lg:border-0 lg:mb-2">
      <div className="flex items-center gap-3">
        <BackButton href="/aluno/perfil" aria-label="Voltar ao perfil" />
        <h1 className="text-lg font-bold text-text-primary tracking-tight">Calendário</h1>
      </div>
    </header>
  );
}
