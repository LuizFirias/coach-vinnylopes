import React from "react";
import { cn } from "@/lib/utils/cn";

interface MobileListRowProps {
  /** Nome principal (trunca para não empurrar o layout). */
  name: string;
  /** Badge de status opcional, exibido ao lado do nome. */
  badge?: React.ReactNode;
  /** Conteúdo à direita (ação/valor), fixado e centralizado verticalmente. */
  topRight?: React.ReactNode;
  /** Linha de metadados inline (plano, atividade, etc.). */
  meta?: React.ReactNode;
  className?: string;
}

/**
 * Linha compacta para converter tabelas em lista de cards no mobile.
 * O separador entre itens fica no container pai (`divide-y`), não nesta row.
 */
export function MobileListRow({ name, badge, topRight, meta, className }: MobileListRowProps) {
  return (
    <div className={cn("flex flex-col gap-1 py-3", className)}>
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <p className="font-semibold text-sm text-text-primary truncate">{name}</p>
          {badge}
        </div>
        {topRight && <div className="shrink-0 flex flex-col items-end gap-1">{topRight}</div>}
      </div>
      {meta && (
        <div className="flex items-center w-full flex-nowrap overflow-hidden gap-x-1 text-[11px] text-text-secondary leading-tight">
          {meta}
        </div>
      )}
    </div>
  );
}

export default MobileListRow;
