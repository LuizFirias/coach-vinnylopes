'use client';

import { Barbell } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

interface DumbbellLoaderProps {
  size?: number;
  /** Aceito por compatibilidade — não é renderizado */
  text?: string;
  /**
   * `page` (padrão): ocupa a tela e fica no centro.
   * `inline`: só o ícone, para uso dentro de cards/seções.
   */
  variant?: 'page' | 'inline';
  className?: string;
}

/**
 * Spinner CSS-only — sem framer-motion, gira assim que o HTML pinta
 * (não espera hidratação de lib de animação).
 */
export default function DumbbellLoader({
  size = 48,
  variant = 'page',
  className,
}: DumbbellLoaderProps) {
  const spinner = (
    <div
      aria-hidden
      className="auron-loader-spin"
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Barbell size={size * 0.6} weight="fill" className="text-brand" />
    </div>
  );

  if (variant === 'inline') {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        role="status"
        aria-label="Carregando"
      >
        {spinner}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-surface-0',
        className,
      )}
      role="status"
      aria-label="Carregando"
    >
      {spinner}
    </div>
  );
}
