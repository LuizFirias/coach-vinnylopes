"use client";

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";

export function WorkoutCalendarHeader() {
  return (
    <header className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-surface-0 border-b border-surface-2 lg:mx-0 lg:px-0 lg:static lg:border-0 lg:mb-2">
      <div className="flex items-center gap-3">
        <Link
          href="/aluno/perfil"
          className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors active:scale-95 shrink-0"
          aria-label="Voltar ao perfil"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-bold text-text-primary tracking-tight">Calendário</h1>
      </div>
    </header>
  );
}
