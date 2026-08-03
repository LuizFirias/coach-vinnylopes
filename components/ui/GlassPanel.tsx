import { type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type GlassFamily = 'brand' | 'success' | 'warning' | 'danger';
export type GlassLevel = 1 | 2 | 3 | 4 | 5;

export type GlassPanelVariant = `${GlassFamily}-${GlassLevel}`;

/** Roxo brand (#751BB4) — KPIs e faturamento da dashboard coach */
export const DASHBOARD_KPI_GLASS: GlassPanelVariant = 'brand-1';

const GLASS_RGB: Record<GlassFamily, { r: number; g: number; b: number }> = {
  brand: { r: 147, g: 51, b: 234 },
  success: { r: 57, g: 199, b: 90 },
  warning: { r: 245, g: 158, b: 11 },
  danger: { r: 224, g: 85, b: 85 },
};

/** Cada nível escurece a cor base em 15% (nível 1 = base, 5 = −60%). */
export function getGlassPanelStyle(
  family: GlassFamily,
  level: GlassLevel,
  opacity = 0.55,
): CSSProperties {
  const step = level - 1;
  const factor = 1 - step * 0.15;
  const base = GLASS_RGB[family];
  const r = Math.round(base.r * factor);
  const g = Math.round(base.g * factor);
  const b = Math.round(base.b * factor);

  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${opacity})`,
    boxShadow: `0 12px 32px rgba(${r}, ${g}, ${b}, 0.38)`,
  };
}

export function parseGlassVariant(variant: GlassPanelVariant): {
  family: GlassFamily;
  level: GlassLevel;
} {
  const [family, levelStr] = variant.split('-') as [GlassFamily, string];
  const level = Number(levelStr) as GlassLevel;
  return { family, level };
}

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: GlassPanelVariant;
  family?: GlassFamily;
  level?: GlassLevel;
  /** Brilho interno — `subtle` para cards de dashboard */
  shine?: 'default' | 'subtle';
  /** No light theme, opcionalmente usa surface-1 sólido (não usar em KPIs glass) */
  flatInLight?: boolean;
  children: ReactNode;
}

const SHINE_GRADIENT = {
  default:
    'bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.04)_42%,transparent_68%)]',
  subtle:
    'bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.01)_40%,transparent_65%)]',
} as const;

const SHINE_LINE = {
  default: 'bg-white/15',
  subtle: 'bg-white/5',
} as const;

export function GlassPanel({
  variant = 'brand-1',
  family: familyProp,
  level: levelProp,
  shine = 'default',
  flatInLight = false,
  className,
  style,
  children,
  ...rest
}: GlassPanelProps) {
  const parsed = parseGlassVariant(variant);
  const family = familyProp ?? parsed.family;
  const level = levelProp ?? parsed.level;
  const shadowStrength = shine === 'subtle' ? 0.28 : 0.38;
  // Cor mais profunda (−30%) e cobertura alta no light (evita pastel lavado)
  const glassOpacity = shine === 'subtle' ? 0.9 : 0.62;
  const effectiveLevel = (
    shine === 'subtle' ? Math.min(5, level + 2) : level
  ) as GlassLevel;
  const glassStyle = getGlassPanelStyle(family, effectiveLevel, glassOpacity);
  const rgbMatch = String(glassStyle.backgroundColor).match(/rgba\((\d+),\s*(\d+),\s*(\d+)/);
  const shadowColor = rgbMatch
    ? `0 12px 32px rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${shadowStrength})`
    : glassStyle.boxShadow;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl backdrop-blur-lg',
        shine === 'subtle' ? 'border border-white/10' : 'border border-white/15',
        flatInLight && 'glass-panel-flat-light',
        className,
      )}
      style={{ ...glassStyle, boxShadow: shadowColor, ...style }}
      {...rest}
    >
      <span
        aria-hidden
        className={cn(
          'glass-panel-shine pointer-events-none absolute inset-0',
          SHINE_GRADIENT[shine],
        )}
      />
      <span
        aria-hidden
        className={cn(
          'glass-panel-shine-line pointer-events-none absolute inset-x-0 top-0 h-px',
          SHINE_LINE[shine],
        )}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export const GLASS_VARIANT_META: {
  variant: GlassPanelVariant;
  label: string;
  note: string;
}[] = [
  { variant: 'brand-1', label: 'Brand 1', note: 'Base #751BB4 · KPI info / ações' },
  { variant: 'brand-2', label: 'Brand 2', note: '−15% luminosidade' },
  { variant: 'brand-3', label: 'Brand 3', note: '−30% luminosidade' },
  { variant: 'brand-4', label: 'Brand 4', note: '−45% luminosidade' },
  { variant: 'brand-5', label: 'Brand 5', note: '−60% luminosidade' },
  { variant: 'success-1', label: 'Success 1', note: 'Base #39c75a' },
  { variant: 'success-2', label: 'Success 2', note: '−15% luminosidade' },
  { variant: 'success-3', label: 'Success 3', note: '−30% luminosidade' },
  { variant: 'success-4', label: 'Success 4', note: '−45% luminosidade' },
  { variant: 'success-5', label: 'Success 5', note: '−60% luminosidade' },
  { variant: 'warning-1', label: 'Warning 1', note: 'Base #F59E0B' },
  { variant: 'warning-2', label: 'Warning 2', note: '−15% luminosidade' },
  { variant: 'warning-3', label: 'Warning 3', note: '−30% luminosidade' },
  { variant: 'warning-4', label: 'Warning 4', note: '−45% luminosidade' },
  { variant: 'warning-5', label: 'Warning 5', note: '−60% luminosidade' },
  { variant: 'danger-1', label: 'Danger 1', note: 'Base #e05555' },
  { variant: 'danger-2', label: 'Danger 2', note: '−15% luminosidade' },
  { variant: 'danger-3', label: 'Danger 3', note: '−30% luminosidade' },
  { variant: 'danger-4', label: 'Danger 4', note: '−45% luminosidade' },
  { variant: 'danger-5', label: 'Danger 5', note: '−60% luminosidade' },
];
