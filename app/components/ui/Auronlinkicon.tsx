'use client';

import { useId } from 'react';
import { iconConfig } from '@/lib/iconConfig';

interface AuronLinkIconProps {
  size?: number;
  active?: boolean;
  className?: string;
  /** Compatibilidade com Phosphor — sem efeito visual */
  weight?: string;
}

export function AuronLinkIcon({
  size = iconConfig.size,
  active = false,
  className,
  weight: _weight,
}: AuronLinkIconProps) {
  const gradId = useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 47"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="50" y1="0" x2="50" y2="47" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2b7fff" />
        </linearGradient>
      </defs>

      {/* C esquerdo */}
      <path
        d="M 37,0 L 23.5,0 C 10.5,0 0,10.5 0,23.5 C 0,36.5 10.5,47 23.5,47 L 37,47 L 37,36 L 23.5,36 C 16.6,36 11,30.4 11,23.5 C 11,16.6 16.6,11 23.5,11 L 37,11 Z"
        fill={active ? `url(#${gradId})` : 'currentColor'}
      />

      {/* C direito */}
      <path
        d="M 63,0 L 76.5,0 C 89.5,0 100,10.5 100,23.5 C 100,36.5 89.5,47 76.5,47 L 63,47 L 63,36 L 76.5,36 C 83.4,36 89,30.4 89,23.5 C 89,16.6 83.4,11 76.5,11 L 63,11 Z"
        fill={active ? `url(#${gradId})` : 'currentColor'}
      />

      {/* Retângulo central — curva 2px só nas pontas */}
      <path
        d="M 30,18.25 L 70,18.25 Q 72,18.25 72,20.25 L 72,26.75 Q 72,28.75 70,28.75 L 30,28.75 Q 28,28.75 28,26.75 L 28,20.25 Q 28,18.25 30,18.25 Z"
        fill={active ? `url(#${gradId})` : 'currentColor'}
      />
    </svg>
  );
}
