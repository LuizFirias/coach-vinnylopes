"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  Fire,
  Trophy,
  Barbell,
  NotePencil,
} from "@phosphor-icons/react";
import { useAuth } from "@/app/components/AuthProvider";
import { DADOS_PREVIEW_ALUNO } from "@/lib/onboarding/dadosPreviewAluno";
import { concluirPasso } from "@/lib/onboarding/concluirPasso";
import { cn } from "@/lib/utils/cn";

export default function PreviewAlunoPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const d = DADOS_PREVIEW_ALUNO;

  useEffect(() => {
    if (loading) return;
    if (!user?.id) {
      router.replace("/login");
      return;
    }
    void concluirPasso(user.id, "ver-como-aluno");
  }, [user?.id, loading, router]);

  const sair = () => {
    if (user?.id) void concluirPasso(user.id, "ver-como-aluno");
    router.push("/admin/dashboard");
  };

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary pb-24">
      <div className="sticky top-0 z-50 bg-warning/10 border-b border-warning/20 flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Eye size={16} weight="fill" className="text-warning shrink-0" />
          <span className="text-sm font-medium text-warning truncate">
            Modo de preview — você está vendo como o aluno vê o app
          </span>
        </div>
        <button
          type="button"
          onClick={sair}
          className="text-xs font-semibold text-warning underline shrink-0"
        >
          Sair do preview
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 flex flex-col gap-5">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
            Olá,
          </p>
          <h1 className="text-xl font-bold text-text-primary mt-0.5">
            {d.nome}
          </h1>
        </header>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-1 p-4">
            <div className="flex items-center gap-2 text-text-tertiary mb-2">
              <Trophy size={16} weight="duotone" className="text-brand" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">
                Pontos
              </span>
            </div>
            <p className="text-2xl font-black tabular-nums tracking-tight">
              {d.pontos}
            </p>
          </div>
          <div className="rounded-xl bg-surface-1 p-4">
            <div className="flex items-center gap-2 text-text-tertiary mb-2">
              <Fire size={16} weight="duotone" className="text-warning" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">
                Sequência
              </span>
            </div>
            <p className="text-2xl font-black tabular-nums tracking-tight">
              {d.sequencia} dias
            </p>
          </div>
        </section>

        <section className="rounded-xl bg-surface-1 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-3">
            Esta semana
          </p>
          <div className="flex justify-between gap-1">
            {d.historicoSemana.map((dia) => (
              <div key={dia.dia} className="flex flex-col items-center gap-1.5 flex-1">
                <span className="text-[10px] text-text-tertiary font-medium">
                  {dia.dia}
                </span>
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold",
                    dia.treinou
                      ? "bg-brand text-text-on-brand"
                      : "bg-surface-2 text-text-disabled",
                  )}
                >
                  {dia.treinou ? "✓" : "·"}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-surface-1 overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-[color:var(--list-row-divider,#1a2540)]">
            <Barbell size={18} weight="duotone" className="text-brand" />
            <div>
              <p className="text-sm font-semibold">{d.fichaAtiva.nomeRotina}</p>
              <p className="text-[11px] text-text-tertiary">
                Ficha do dia · preview
              </p>
            </div>
          </div>
          <ul className="divide-y divide-[color:var(--list-row-divider,#1a2540)]">
            {d.fichaAtiva.exercicios.map((ex) => (
              <li
                key={ex.nome}
                className="px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{ex.nome}</p>
                  <p className="text-xs text-text-secondary tabular-nums mt-0.5">
                    {ex.series} × {ex.reps}
                    {ex.tecnica ? ` · ${ex.tecnica}` : ""}
                  </p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-disabled shrink-0">
                  Ver
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl bg-surface-1 p-4">
          <div className="flex items-center gap-2 mb-2">
            <NotePencil size={16} weight="duotone" className="text-brand" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
              Nota do personal
            </p>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            {d.notaPersonal}
          </p>
        </section>

        <Link
          href="/admin/dashboard"
          onClick={() => {
            if (user?.id) void concluirPasso(user.id, "ver-como-aluno");
          }}
          className="text-center text-sm font-semibold text-brand py-3"
        >
          Voltar ao dashboard do coach
        </Link>
      </div>
    </div>
  );
}
