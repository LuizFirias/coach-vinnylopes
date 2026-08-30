'use client';

import { Image as ImageIcon } from '@phosphor-icons/react';
import { OverviewPanel } from './OverviewPanel';

interface Foto {
  id: string;
  posicao: string;
  url_foto: string;
  data_upload: string;
}

interface ProgressPhotosOverviewCardProps {
  fotos: Foto[];
  onViewAll: () => void;
  onCompare: () => void;
}

export function ProgressPhotosOverviewCard({ fotos, onViewAll, onCompare }: ProgressPhotosOverviewCardProps) {
  const destaque = fotos.slice(0, 4);

  return (
    <OverviewPanel
      title="Fotos de Evolução"
      action={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onViewAll}
            className="text-[11px] font-semibold text-brand hover:text-brand-hover bg-transparent border-0"
          >
            Ver todas
          </button>
          <button
            type="button"
            onClick={onCompare}
            className="text-[11px] font-semibold text-text-secondary hover:text-text-primary bg-transparent border-0"
          >
            Comparar
          </button>
        </div>
      }
    >
      {destaque.length > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {destaque.map((foto) => (
            <div key={foto.id} className="flex flex-col gap-1">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto.url_foto} alt="" className="h-full w-full object-cover" />
              </div>
              <p className="text-center text-[9px] text-text-tertiary">
                {new Date(foto.data_upload).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5 py-3 text-center">
          <ImageIcon size={18} className="text-text-disabled" />
          <p className="text-[11px] text-text-tertiary">Nenhuma foto de evolução ainda.</p>
        </div>
      )}
    </OverviewPanel>
  );
}
