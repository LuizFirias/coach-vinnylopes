'use client';

import { useEffect, useMemo, useState } from 'react';
import { StatsPageHeader } from '@/app/components/statistics/StatsPageHeader';
import { MeasurementCurrentCard } from '@/app/components/measurements/MeasurementCurrentCard';
import { MeasurementLineChart } from '@/app/components/measurements/MeasurementLineChart';
import { MeasurementHistoryList } from '@/app/components/measurements/MeasurementHistoryList';
import { MeasurementInputCard } from '@/app/components/measurements/MeasurementInputCard';
import {
  buildChartData,
  buildHistoryEntries,
  computePeriodDelta,
  formatMeasurementDate,
  getMetricValues,
} from '@/lib/measurements/helpers';
import type { MeasurementMetricId, MeasurementPeriod, MedicaoRecord } from '@/lib/measurements/types';
import { MEASUREMENT_COLORS, MEASUREMENT_METRICS } from '@/lib/measurements/types';
import { cn } from '@/lib/utils/cn';

interface MeasurementsViewProps {
  medicoes: MedicaoRecord[];
  readOnly?: boolean;
  variant?: 'page' | 'embedded';
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  submitting?: boolean;
  inputError?: string | null;
  successMessage?: string | null;
  dataRegistro?: string;
  onDataRegistroChange?: (date: string) => void;
  onSubmitValue?: (metricId: MeasurementMetricId, value: number) => void;
  onDeleteEntry?: (id: string) => void;
  getPlaceholder?: (metricId: MeasurementMetricId) => string;
}

export function MeasurementsView({
  medicoes,
  readOnly = false,
  variant = 'page',
  backHref,
  title = 'Medidas',
  headerAction,
  submitting = false,
  inputError,
  successMessage,
  dataRegistro,
  onDataRegistroChange,
  onSubmitValue,
  onDeleteEntry,
  getPlaceholder,
}: MeasurementsViewProps) {
  const [metricId, setMetricId] = useState<MeasurementMetricId>('peso');
  const [period, setPeriod] = useState<MeasurementPeriod>('30d');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const metric = MEASUREMENT_METRICS.find((m) => m.id === metricId) ?? MEASUREMENT_METRICS[0];

  const chartData = useMemo(
    () => buildChartData(medicoes, metricId, period),
    [medicoes, metricId, period],
  );

  const allValues = useMemo(() => getMetricValues(medicoes, metricId), [medicoes, metricId]);

  const currentValue = allValues[0]?.valor ?? null;
  const lastUpdated = allValues[0]
    ? formatMeasurementDate(allValues[0].data, true)
    : null;
  const lastDateShort = allValues[0]
    ? new Date(allValues[0].data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : null;

  const periodDelta = useMemo(
    () => computePeriodDelta(allValues, period),
    [allValues, period],
  );

  const historyEntries = useMemo(
    () =>
      buildHistoryEntries(medicoes, metricId, metric.unit).map((entry) => {
        const raw = medicoes.find((m) => m.id === entry.id)?.data_medicao;
        return {
          ...entry,
          dateShort: raw
            ? new Date(raw).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : entry.date,
        };
      }),
    [medicoes, metricId, metric.unit],
  );

  const chartPoints = chartData.map((d) => ({ date: d.date, value: d.value }));

  const content = (
    <>
      {variant === 'embedded' && headerAction && (
        <div className="mb-2 flex justify-end">{headerAction}</div>
      )}

      {successMessage && (
        <div
          className="rounded-lg border px-3 py-2 text-xs font-medium"
          style={{
            backgroundColor: 'rgba(57,199,90,0.08)',
            borderColor: 'rgba(57,199,90,0.2)',
            color: MEASUREMENT_COLORS.deltaDown,
          }}
        >
          {successMessage}
        </div>
      )}

      <div
        className={cn(
          'flex flex-col gap-5',
          isDesktop && 'grid grid-cols-[1fr_1.3fr] gap-8 items-start',
        )}
      >
        <div className={cn(isDesktop && 'sticky top-24')}>
          <MeasurementCurrentCard
            metricId={metricId}
            onMetricChange={setMetricId}
            value={currentValue}
            unit={metric.unit}
            lastUpdated={lastUpdated}
            delta={periodDelta}
            deltaLabel="no período"
            period={period}
            onPeriodChange={setPeriod}
            chartData={chartPoints}
            isDesktop={isDesktop}
            showChart={!isDesktop}
          />

          {!readOnly && onSubmitValue && dataRegistro && onDataRegistroChange && (
            <>
              <div
                style={{
                  height: 1,
                  background: 'rgba(0,0,0,0.06)',
                  margin: '16px 0',
                }}
              />
              <MeasurementInputCard
                unit={metric.unit}
                date={dataRegistro}
                placeholder={getPlaceholder?.(metricId) || '0'}
                submitting={submitting}
                error={inputError}
                lastValue={currentValue}
                lastDateShort={lastDateShort}
                onDateChange={onDataRegistroChange}
                onSubmit={(value) => onSubmitValue(metricId, value)}
              />
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {isDesktop && (
            <MeasurementLineChart data={chartPoints} isDesktop />
          )}

          <div
            style={{
              height: 1,
              background: 'rgba(0,0,0,0.06)',
            }}
            className="lg:hidden"
          />

          <MeasurementHistoryList
            entries={historyEntries}
            showAll={showAllHistory}
            onSeeAll={() => setShowAllHistory(true)}
            onDelete={onDeleteEntry}
          />
        </div>
      </div>
    </>
  );

  if (variant === 'embedded') {
    return <div className="flex flex-col gap-4">{content}</div>;
  }

  return (
    <div
      className="min-h-screen text-text-primary pb-[calc(5rem+env(safe-area-inset-bottom))]"
      style={{ background: 'var(--mobile-page-bg-solid)' }}
    >      <div className={cn('mx-auto w-full', isDesktop ? 'max-w-[960px] px-6 py-8' : 'max-w-2xl')}>
        {backHref && (
          <StatsPageHeader title={title} backHref={backHref} />
        )}

        <div className={cn('flex flex-col gap-4', isDesktop ? 'px-0 pt-6' : 'px-4 pt-4')}>
          {content}
        </div>
      </div>
    </div>
  );
}
