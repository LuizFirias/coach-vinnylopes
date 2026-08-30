'use client';

import { User } from '@phosphor-icons/react';
import { OverviewPanel } from './OverviewPanel';

/** Card "Perfil" — casca vazia por enquanto, conteúdo a definir. */
export function ProfileInfoCard() {
  return (
    <OverviewPanel title="Perfil">
      <div className="flex flex-col items-center gap-1.5 py-4 text-center">
        <User size={18} className="text-text-disabled" />
        <p className="text-[11px] text-text-tertiary">Em breve</p>
      </div>
    </OverviewPanel>
  );
}
