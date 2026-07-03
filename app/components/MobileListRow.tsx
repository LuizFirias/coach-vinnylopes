import React from "react";

interface MobileListRowProps {
  /** Nome principal (trunca para não empurrar o layout). */
  name: string;
  /** Badge de status opcional, exibido ao lado do nome. */
  badge?: React.ReactNode;
  /** Conteúdo à direita (ação/valor), fixado e centralizado verticalmente. */
  topRight?: React.ReactNode;
  /** Linha de metadados inline (plano, atividade, etc.). */
  meta?: React.ReactNode;
}

/**
 * Linha compacta para converter tabelas em lista de cards no mobile.
 * Reutilizada em "Saúde dos alunos" (Fase 3) e "Acompanhamento Alimentar" (Fase 7).
 */
export function MobileListRow({ name, badge, topRight, meta }: MobileListRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-border-subtle/50 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-semibold text-sm text-text-primary truncate">{name}</p>
          {badge}
        </div>
        {meta && (
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1 text-xs text-text-secondary">
            {meta}
          </div>
        )}
      </div>
      {topRight && <div className="shrink-0 flex flex-col items-end gap-1">{topRight}</div>}
    </div>
  );
}

export default MobileListRow;
