/**
 * COMPONENTS-STARTER.tsx
 * ────────────────────────────────────────────────────────────────
 * Componentes React/TypeScript prontos para colar no projeto Next.js.
 * Cada bloco abaixo deve virar um arquivo separado em /components.
 * Stack: Next.js 15 (App Router) + React 19 + Tailwind + lucide-react.
 *
 * Dependências:
 *   npm install lucide-react clsx tailwind-merge framer-motion sonner
 *
 * Setup:
 *   1. Importar Inter no app/layout.tsx
 *   2. tailwind.config.js do pacote já configurado
 *   3. design-tokens.css importado em app/globals.css
 * ────────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════
// FILE: lib/utils/cn.ts
// ═══════════════════════════════════════════════════════════════

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ═══════════════════════════════════════════════════════════════
// FILE: lib/utils/haptics.ts
// ═══════════════════════════════════════════════════════════════

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export function haptic(pattern: HapticPattern = 'light') {
  if (typeof window === 'undefined' || !navigator.vibrate) return;

  const patterns: Record<HapticPattern, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 10],
    warning: [20, 100, 20],
    error: [50, 100, 50, 100, 50],
  };

  navigator.vibrate(patterns[pattern]);
}

// ═══════════════════════════════════════════════════════════════
// FILE: lib/utils/format.ts
// ═══════════════════════════════════════════════════════════════

import { format as formatFn } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatDate(date: Date | string, pattern = "EEEE, d 'de' MMMM"): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatFn(d, pattern, { locale: ptBR });
}

export function formatWeight(kg: number | null | undefined): string {
  if (kg == null) return '—';
  return `${kg.toFixed(1).replace('.', ',')} kg`;
}

export function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} ton`;
  return `${kg.toLocaleString('pt-BR')} kg`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ═══════════════════════════════════════════════════════════════
// FILE: components/ui/Button.tsx
// ═══════════════════════════════════════════════════════════════

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-text-on-brand hover:bg-brand-hover hover:shadow-glow-brand active:bg-brand-pressed',
  secondary:
    'bg-surface-3 text-text-primary border border-border hover:bg-surface-2',
  ghost:
    'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-2',
  danger:
    'bg-danger-subtle text-danger border border-danger-border hover:bg-danger hover:text-text-primary',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-5 text-base',
  lg: 'h-14 px-6 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth,
    className,
    children,
    disabled,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        // base
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold',
        'transition-all duration-fast ease-out',
        'active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        'focus-visible:outline-none focus-visible:shadow-focus-ring',
        // variants
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

// ═══════════════════════════════════════════════════════════════
// FILE: components/ui/Card.tsx
// ═══════════════════════════════════════════════════════════════

import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type CardVariant = 'default' | 'primary' | 'interactive';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  children: ReactNode;
}

const cardVariants: Record<CardVariant, string> = {
  default: 'bg-surface-1 border border-border',
  primary: 'bg-surface-2 border border-brand-border shadow-glow-brand',
  interactive:
    'bg-surface-1 border border-border cursor-pointer transition-all duration-fast ease-out hover:bg-surface-2 active:scale-[0.99]',
};

export function Card({ variant = 'default', className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg p-4',
        cardVariants[variant],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FILE: components/ui/Input.tsx
// ═══════════════════════════════════════════════════════════════

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helperText, error, className, id, ...rest },
  ref
) {
  const inputId = id || rest.name;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          // base — font-size 16px evita zoom no iOS
          'h-12 w-full rounded-md px-4 text-base',
          'bg-surface-2 border border-border text-text-primary',
          'placeholder:text-text-tertiary',
          'transition-all duration-fast ease-out',
          'focus:outline-none focus:border-brand focus:shadow-focus-ring',
          error && 'border-danger',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-danger">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${inputId}-helper`} className="text-xs text-text-tertiary">
          {helperText}
        </p>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// FILE: components/ui/EmptyState.tsx
// ═══════════════════════════════════════════════════════════════

import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  cta?: ReactNode;
  hint?: string;
}

export function EmptyState({ icon: Icon, title, description, cta, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-text-tertiary" strokeWidth={1.75} />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-sm text-text-secondary max-w-xs mb-6">
        {description}
      </p>
      {cta && <div className="mb-4">{cta}</div>}
      {hint && (
        <p className="text-xs text-text-tertiary max-w-xs">
          💡 {hint}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FILE: components/ui/Skeleton.tsx
// ═══════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md',
        'bg-gradient-to-r from-surface-1 via-surface-2 to-surface-1',
        'bg-[length:200%_100%] animate-shimmer',
        className
      )}
      aria-hidden="true"
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// FILE: components/layout/BottomNav.tsx
// ═══════════════════════════════════════════════════════════════

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Dumbbell,
  Utensils,
  TrendingUp,
  Trophy,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const NAV_ITEMS = [
  { href: '/inicio',    label: 'Início',    icon: Home },
  { href: '/treinos',   label: 'Treinos',   icon: Dumbbell },
  { href: '/nutricao',  label: 'Nutrição',  icon: Utensils },
  { href: '/progresso', label: 'Progresso', icon: TrendingUp },
  { href: '/ranking',   label: 'Ranking',   icon: Trophy },
  { href: '/perfil',    label: 'Perfil',    icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-surface-0 border-t border-border-subtle',
        'pb-[env(safe-area-inset-bottom)]'
      )}
      aria-label="Navegação principal"
    >
      <ul className="flex items-stretch justify-around h-16 max-w-mobile mx-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 h-full',
                  'transition-colors duration-fast ease-out',
                  isActive ? 'text-brand' : 'text-text-tertiary'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className="w-6 h-6"
                  strokeWidth={isActive ? 2.25 : 1.75}
                  fill={isActive ? 'currentColor' : 'none'}
                  fillOpacity={isActive ? 0.18 : 0}
                />
                <span
                  className={cn(
                    'text-2xs',
                    isActive ? 'font-semibold' : 'font-medium'
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════
// FILE: components/layout/ScreenHeader.tsx
// ═══════════════════════════════════════════════════════════════

import { type ReactNode } from 'react';

interface ScreenHeaderProps {
  greeting?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function ScreenHeader({ greeting, title, subtitle, action }: ScreenHeaderProps) {
  return (
    <header className="px-4 pt-6 pb-4">
      {greeting && (
        <p className="text-base text-text-secondary mb-1">{greeting}</p>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════
// FILE: components/dashboard/KpiCard.tsx
// ═══════════════════════════════════════════════════════════════

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: {
    value: string;            // "+8%" ou "−1.2 kg"
    direction: 'up' | 'down' | 'neutral';
    isFavorable: boolean;     // direção favorável depende do contexto (peso baixou em cutting = bom)
    period: string;           // "vs sem. pas." ou "em 30d"
  };
}

export function KpiCard({ label, value, unit, delta }: KpiCardProps) {
  const DeltaIcon =
    delta?.direction === 'up' ? ArrowUp :
    delta?.direction === 'down' ? ArrowDown : Minus;

  return (
    <Card className="flex flex-col gap-2">
      <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="font-mono tabular-nums font-semibold text-3xl text-text-primary tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="text-sm text-text-secondary">{unit}</span>
        )}
      </div>
      {delta && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs',
            delta.direction === 'neutral'
              ? 'text-text-tertiary'
              : delta.isFavorable
                ? 'text-success'
                : 'text-danger'
          )}
        >
          <DeltaIcon className="w-3 h-3" strokeWidth={2.5} />
          <span className="font-medium">{delta.value}</span>
          <span className="text-text-tertiary ml-0.5">{delta.period}</span>
        </div>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// FILE: components/dashboard/WeekStreakDots.tsx
// ═══════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils/cn';

type DayStatus = 'completed' | 'planned' | 'rest' | 'today';

interface WeekStreakDotsProps {
  /** 7 dias da semana (segunda a domingo) */
  days: { label: string; status: DayStatus }[];
  streakCount?: number;
}

const dotClasses: Record<DayStatus, string> = {
  completed: 'bg-success border-success',
  planned:   'bg-transparent border-brand',
  today:     'bg-brand border-brand animate-pulse',
  rest:      'bg-transparent border-text-tertiary',
};

export function WeekStreakDots({ days, streakCount }: WeekStreakDotsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {days.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
            <span className="text-2xs font-medium uppercase tracking-caps text-text-tertiary">
              {day.label}
            </span>
            <div
              className={cn(
                'w-3 h-3 rounded-full border-2',
                dotClasses[day.status]
              )}
              aria-label={`${day.label}: ${day.status}`}
            />
          </div>
        ))}
      </div>
      {streakCount != null && streakCount > 0 && (
        <p className="text-sm text-text-secondary text-center">
          Você está em <span className="font-semibold text-text-primary">{streakCount} dias</span>{' '}
          {streakCount >= 7 ? '🔥' : ''}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FILE: components/dashboard/TodayWorkoutCard.tsx
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Play, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatVolume } from '@/lib/utils/format';

interface TodayWorkoutCardProps {
  workout: {
    id: string;
    name: string;
    exerciseCount: number;
    estimatedDurationMin: number;
    lastSessionVolumeKg?: number;
    isCompletedToday?: boolean;
    completedDuration?: number;
    completedVolume?: number;
  } | null;
}

export function TodayWorkoutCard({ workout }: TodayWorkoutCardProps) {
  if (!workout) {
    return (
      <Card>
        <div className="text-center py-6">
          <h3 className="text-lg font-semibold text-text-primary mb-1">
            Hoje é dia de descanso
          </h3>
          <p className="text-sm text-text-secondary">
            Aproveite — recuperação é treino também.
          </p>
        </div>
      </Card>
    );
  }

  if (workout.isCompletedToday) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-success-subtle border border-success-border flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5 text-success" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-secondary">Concluído hoje</p>
            <h3 className="text-lg font-semibold text-text-primary truncate">
              {workout.name}
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              {workout.completedDuration} min · {formatVolume(workout.completedVolume ?? 0)}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="primary">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-caps text-brand mb-1">
            Treino de hoje
          </p>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">
            {workout.name}
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            {workout.exerciseCount} exercícios · ~{workout.estimatedDurationMin} min
          </p>
          {workout.lastSessionVolumeKg && (
            <p className="text-xs text-text-tertiary mt-2">
              Última sessão: vol. {formatVolume(workout.lastSessionVolumeKg)}
            </p>
          )}
        </div>
        <Link href={`/treinos/${workout.id}`} className="block">
          <Button variant="primary" fullWidth leftIcon={<Play className="w-4 h-4" fill="currentColor" />}>
            Começar treino
          </Button>
        </Link>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// FILE: components/treinos/PreviousSetIndicator.tsx
// (Componente CRÍTICO — peso anterior em destaque, §1.3)
//
// Consome o resultado de get_ultimo_treino_exercicio() do Supabase.
// O front extrai a série de mesma `ordem` da última sessão.
// ═══════════════════════════════════════════════════════════════

import { formatWeight } from '@/lib/utils/format';

export interface SerieAnterior {
  peso: number;
  reps: number;
}

interface PreviousSetIndicatorProps {
  /** null = aluno nunca executou essa série antes (primeira vez) */
  anterior: SerieAnterior | null;
}

export function PreviousSetIndicator({ anterior }: PreviousSetIndicatorProps) {
  return (
    <div className="bg-surface-2 rounded-md p-3 flex flex-col gap-1">
      <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">
        Anterior
      </span>
      {anterior == null ? (
        <p className="text-sm text-text-secondary">
          Primeira vez · comece leve, foque na técnica
        </p>
      ) : (
        <p className="text-base font-mono tabular-nums font-medium text-text-primary">
          {formatWeight(anterior.peso)} × {anterior.reps}
        </p>
      )}
    </div>
  );
}

/**
 * Helper para extrair a série anterior do JSONB retornado por
 * get_ultimo_treino_exercicio. Filtra apenas séries completadas
 * com peso real (peso_atual > 0).
 *
 * @example
 *   const { data: ultima } = await supabase.rpc('get_ultimo_treino_exercicio', {
 *     p_aluno_id: user.id,
 *     p_exercicio_id: exercicioId
 *   });
 *   const anterior = getSerieAnterior(ultima, ordemSerie);
 *   <PreviousSetIndicator anterior={anterior} />
 */
export function getSerieAnterior(
  ultimaSessao: { series?: Array<{ ordem: number; peso_atual: number; reps: number | string; completado: boolean }> } | null,
  ordemSerie: number
): SerieAnterior | null {
  if (!ultimaSessao?.series) return null;
  const serie = ultimaSessao.series.find(
    s => s.ordem === ordemSerie && s.completado && s.peso_atual > 0
  );
  if (!serie) return null;
  const reps = typeof serie.reps === 'string' ? parseInt(serie.reps, 10) : serie.reps;
  if (!Number.isFinite(reps) || reps < 1) return null;
  return { peso: serie.peso_atual, reps };
}

// ═══════════════════════════════════════════════════════════════
// FILE: components/treinos/RestTimer.tsx
// (Timer de descanso ativo, com som + vibração — §4.3)
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { haptic } from '@/lib/utils/haptics';
import { formatDuration } from '@/lib/utils/format';

interface RestTimerProps {
  durationSeconds: number;
  onComplete: () => void;
  onSkip: () => void;
  nextSetInfo?: string; // "Crossover · Série 3 de 3 · sugestão 32.5 kg"
}

export function RestTimer({ durationSeconds, onComplete, onSkip, nextSetInfo }: RestTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const completedRef = useRef(false);

  useEffect(() => {
    if (remaining <= 0 && !completedRef.current) {
      completedRef.current = true;
      haptic('success');
      onComplete();
      return;
    }

    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [remaining, onComplete]);

  const progress = ((durationSeconds - remaining) / durationSeconds) * 100;

  function add(secs: number) {
    haptic('light');
    setRemaining((r) => Math.max(0, r + secs));
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-8">
      <p className="text-sm text-text-secondary">Descansando…</p>

      <div className="relative w-48 h-48 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor"
            className="text-surface-2" strokeWidth="6" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor"
            className="text-brand transition-[stroke-dashoffset] duration-1000 ease-linear"
            strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 46}`}
            strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress / 100)}`}
            strokeLinecap="round" />
        </svg>
        <div className="text-center">
          <p className="font-mono tabular-nums font-semibold text-5xl text-text-primary tracking-tight">
            {formatDuration(remaining)}
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            de {formatDuration(durationSeconds)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => add(15)}
        >
          15s
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<SkipForward className="w-4 h-4" />}
          onClick={() => { haptic('medium'); onSkip(); }}
        >
          Pular
        </Button>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => add(30)}
        >
          30s
        </Button>
      </div>

      {nextSetInfo && (
        <div className="text-center mt-4">
          <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-1">
            Próxima série
          </p>
          <p className="text-sm text-text-primary">{nextSetInfo}</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FILE: components/medidas/OutlierWarningDialog.tsx
// (Dialog de soft warning para medidas — DESIGN-SPEC §13.4)
// ═══════════════════════════════════════════════════════════════

'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface OutlierWarningDialogProps {
  campo: string;          // "cintura", "peitoral", "peso"
  novoValor: number;
  ultimoValor: number;
  unidade: string;        // "kg", "cm"
  onConfirmar: () => void;
  onEditar: () => void;
}

export function OutlierWarningDialog({
  campo,
  novoValor,
  ultimoValor,
  unidade,
  onConfirmar,
  onEditar,
}: OutlierWarningDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="outlier-title"
    >
      <Card className="w-full max-w-sm">
        <h3 id="outlier-title" className="text-lg font-semibold text-text-primary mb-2">
          Confirma esse valor?
        </h3>
        <p className="text-sm text-text-secondary mb-4 leading-relaxed">
          Você digitou <span className="font-semibold text-text-primary">{novoValor} {unidade}</span> em {campo}.
          Sua última medida era <span className="font-semibold text-text-primary">{ultimoValor} {unidade}</span>.
        </p>
        <p className="text-xs text-text-tertiary mb-6">
          Variação grande — só queremos garantir que não foi erro de digitação.
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={onEditar}>
            Editar valor
          </Button>
          <Button variant="primary" onClick={onConfirmar}>
            Manter {novoValor} {unidade}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FILE: app/globals.css (acrescentar ao arquivo)
// ═══════════════════════════════════════════════════════════════

/*
@import './design-tokens.css';

@tailwind base;
@tailwind components;
@tailwind utilities;
*/

// ═══════════════════════════════════════════════════════════════
// FILE: app/layout.tsx (root layout — Next.js App Router)
// ═══════════════════════════════════════════════════════════════

/*
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Seu App — Personal',
  description: 'Sua rotina de treinos, nutrição e progresso.',
};

export const viewport: Viewport = {
  themeColor: '#0A0A0B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-surface-0 text-text-primary antialiased">
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--surface-2)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            },
          }}
        />
      </body>
    </html>
  );
}
*/
