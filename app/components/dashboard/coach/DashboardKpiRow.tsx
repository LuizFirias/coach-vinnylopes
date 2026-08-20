'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from '@phosphor-icons/react';
import { GlassPanel, DASHBOARD_KPI_GLASS, type GlassPanelVariant } from '@/components/ui/GlassPanel';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

export type KpiDot = 'green' | 'blue' | 'red' | 'yellow';

export interface CoachKpiCardProps {
  dot: KpiDot;
  label: string;
  value: string | number;
  subtitle: string;
  infoText: string;
  glassVariant?: GlassPanelVariant;
  delta?: number | null;
  compact?: boolean;
}

const DOT_CLASS: Record<KpiDot, string> = {
  green: 'bg-success',
  blue: 'bg-brand',
  red: 'bg-danger',
  yellow: 'bg-warning',
};

export function CoachKpiCard({
  dot,
  label,
  value,
  subtitle,
  infoText,
  glassVariant = DASHBOARD_KPI_GLASS,
  delta,
  compact,
}: CoachKpiCardProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!infoOpen || !cardRef.current) {
      setTooltipPos(null);
      return;
    }

    const update = () => {
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Um pouco menor que o KPI; alinhado à direita (ícone info)
      const width = Math.min(Math.max(rect.width * 0.82, 140), 200);
      let left = rect.right - width;
      left = Math.min(Math.max(8, left), window.innerWidth - width - 8);
      setTooltipPos({
        top: rect.top - 6,
        left,
        width,
      });
    };

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [infoOpen]);

  useEffect(() => {
    if (!infoOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (cardRef.current?.contains(target)) return;
      if (tooltipRef.current?.contains(target)) return;
      setInfoOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setInfoOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [infoOpen]);

  const tooltip =
    mounted &&
    infoOpen &&
    tooltipPos &&
    createPortal(
      <div
        ref={tooltipRef}
        id={popoverId}
        role="tooltip"
        className="coach-kpi-tooltip fixed z-[80] -translate-y-full rounded-lg border border-border-subtle bg-surface-2 px-2.5 py-2 shadow-elev-2"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: tooltipPos.width,
        }}
      >
        <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-tertiary">
          {label}
        </p>
        <p className="text-[10px] leading-relaxed text-text-secondary">{infoText}</p>
      </div>,
      document.body,
    );

  return (
    <div ref={cardRef} className="relative coach-kpi-card">
      <GlassPanel
        variant={glassVariant}
        shine="subtle"
        className={cn(
          'relative flex flex-col justify-start min-h-[88px] px-3 pb-3 pt-2',
          compact && 'min-h-[80px] px-2 pb-2 pt-1.5',
        )}
      >
        <div className="relative flex items-center justify-between gap-2 mb-2 min-h-[14px]">
          <div className="flex min-w-0 items-center gap-1.5 leading-none">
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', DOT_CLASS[dot])} />
            <span
              className={cn(
                'coach-kpi-label font-semibold uppercase tracking-wider whitespace-nowrap',
                compact ? 'text-[10px]' : 'text-[11px]',
              )}
            >
              {label}
            </span>
          </div>
          <button
            type="button"
            aria-label={`O que é ${label}?`}
            aria-expanded={infoOpen}
            aria-controls={popoverId}
            onClick={() => setInfoOpen((open) => !open)}
            className={cn(
              'coach-kpi-info-btn z-20 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all active:scale-95',
              infoOpen && 'is-open',
            )}
          >
            <Info size={compact ? 13 : 14} weight="bold" />
          </button>
        </div>
        <div
          className={cn(
            'coach-kpi-value font-bold font-kpi tabular-nums lining-nums leading-none',
            compact ? 'text-[26px] tracking-tight' : 'text-[32px] tracking-display',
          )}
          style={
            compact
              ? undefined
              : { letterSpacing: 'var(--tracking-display, -0.03em)' }
          }
        >
          {value}
        </div>
        {delta != null ? (
          <span
            className={cn(
              'text-[11px] mt-1.5 leading-none font-medium',
              delta >= 0 ? 'coach-kpi-delta-up' : 'coach-kpi-delta-down',
            )}
          >
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}% vs. mês anterior
          </span>
        ) : (
          <span className="coach-kpi-subtitle text-[11px] mt-1.5 leading-none">{subtitle}</span>
        )}
      </GlassPanel>
      {tooltip}
    </div>
  );
}

export interface DashboardKpiRowProps {
  activeStudents: number;
  mrr: number;
  studentsAtRisk: number;
  pendingCheckIns: number;
  activeStudentsSubtitle?: string;
  mrrDeltaPercent?: number | null;
  compact?: boolean;
  /** Título da seção acima dos cards — "Visão geral" por padrão, "Meu Negócio" no layout novo do desktop. */
  title?: string;
}

export function DashboardKpiRow({
  activeStudents,
  mrr,
  studentsAtRisk,
  pendingCheckIns,
  activeStudentsSubtitle = 'Perfis pagantes vigentes',
  mrrDeltaPercent,
  compact,
  title = 'Visão geral',
}: DashboardKpiRowProps) {
  return (
    <div>
      <h2 className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
        {title}
      </h2>
      <div
        className={cn(
          'grid gap-3 md:gap-4 items-start',
          compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4',
        )}
      >
        <CoachKpiCard
          dot="blue"
          label="MRR ativo"
          value={formatCurrency(mrr)}
          subtitle="Recorrência mensal"
          infoText="Receita mensal estimada a partir dos planos ativos — mensal, trimestral, semestral ou anual rateados."
          delta={mrrDeltaPercent}
          compact={compact}
        />
        <CoachKpiCard
          dot="green"
          label="Alunos ativos"
          value={activeStudents}
          subtitle={activeStudentsSubtitle}
          infoText="Alunos com plano pago e vigente na sua consultoria."
          compact={compact}
        />
        <CoachKpiCard
          dot="red"
          label="Alunos em risco"
          value={studentsAtRisk}
          subtitle="Inativos há mais de 7 dias"
          infoText="Alunos que não registram treino há mais de 7 dias e podem precisar de acompanhamento."
          glassVariant={studentsAtRisk > 0 ? 'danger-1' : DASHBOARD_KPI_GLASS}
          compact={compact}
        />
        <CoachKpiCard
          dot="yellow"
          label="Atualizações"
          value={pendingCheckIns}
          subtitle="Nos últimos 7 dias"
          infoText="Fotos de evolução e medidas corporais enviadas pelos alunos na última semana."
          compact={compact}
        />
      </div>
    </div>
  );
}
