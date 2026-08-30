"use client";

import { BackButton } from "@/app/components/ui/BackButton";

interface WorkoutBuilderHeaderProps {
  isMobile: boolean;
  nomeRotina: string;
  onBack: () => void;
  onRotinaChange: (nome: string) => void;
  /** Posição desta rotina entre as que estão sendo criadas (null no modo edição). */
  rotinaNumero?: number | null;
}

/** Cabeçalho da rotina — só o nome dela agora (o Aluno subiu pra linha dos
 *  botões de salvar, ver AlunoAvatarPicker em WorkoutBuilderScreen.tsx).
 *  No modo create, o card já vem com o tom roxo + número da rotina — mesmo
 *  visual das rotinas colapsadas, só que sempre no topo, sem subir/descer. */
export function WorkoutBuilderHeader({
  isMobile,
  nomeRotina,
  onBack,
  onRotinaChange,
  rotinaNumero = null,
}: WorkoutBuilderHeaderProps) {
  const cardStyle =
    rotinaNumero != null
      ? { background: "linear-gradient(135deg, rgba(245, 208, 97,0.16) 0%, rgba(212, 168, 67,0.10) 100%)" }
      : undefined;

  if (isMobile) {
    return (
      <div className="sticky top-0 z-20 bg-surface-0 border-0 py-3">
        <div className="flex items-center gap-2">
          <BackButton onClick={onBack} />
          <div
            className="field-flat-input min-w-0 flex-1 flex items-center gap-2 rounded-2xl border border-border-subtle bg-surface-1 px-3.5 py-3"
            style={cardStyle}
          >
            {rotinaNumero != null && (
              <span className="shrink-0 text-[11px] font-bold text-brand">Rotina {rotinaNumero}</span>
            )}
            <input
              type="text"
              value={nomeRotina}
              onChange={(e) => onRotinaChange(e.target.value)}
              placeholder="Nome da rotina"
              aria-label="Nome da rotina"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-bwignore
              className="w-full appearance-none bg-transparent border-0 rounded-none p-0 text-[13px] font-semibold text-text-primary placeholder:text-text-disabled placeholder:font-normal focus:outline-none focus:ring-0"
              style={{ border: "none", boxShadow: "none", outline: "none" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-20 bg-surface-0 border-0 px-4 md:px-0 pb-3 mb-2">
      {/* Seta fora do fluxo — não empurra o card pra baixo, então o topo dele
          alinha com o card "Aluno" na coluna da direita. */}
      <div className="relative">
        <BackButton
          onClick={onBack}
          className="absolute left-0 top-1/2 -translate-x-[calc(100%+10px)] -translate-y-1/2"
        />

        <div
          className="field-flat-input min-w-0 w-full flex items-center gap-2 rounded-2xl border border-border-subtle bg-surface-1 px-4 py-3"
          style={cardStyle}
        >
          {rotinaNumero != null && (
            <span className="shrink-0 text-xs font-bold text-brand">Rotina {rotinaNumero}</span>
          )}
          <input
            type="text"
            value={nomeRotina}
            onChange={(e) => onRotinaChange(e.target.value)}
            placeholder="Nome da rotina"
            aria-label="Nome da rotina"
            autoComplete="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            className="w-full appearance-none bg-transparent border-0 rounded-none p-0 text-sm font-semibold text-text-primary placeholder:text-text-disabled placeholder:font-normal focus:outline-none focus:ring-0"
            style={{ border: "none", boxShadow: "none", outline: "none" }}
          />
        </div>
      </div>
    </div>
  );
}
