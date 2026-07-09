'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import { MeasurementCurrentCard } from '@/app/components/measurements/MeasurementCurrentCard';
import { MeasurementHistoryList } from '@/app/components/measurements/MeasurementHistoryList';
import { MeasurementInputCard } from '@/app/components/measurements/MeasurementInputCard';
import { MeasurementTabs } from '@/app/components/measurements/MeasurementTabs';
import {
  buildChartData,
  buildHistoryEntries,
  computePeriodDelta,
  formatMeasurementDate,
  getMetricValues,
} from '@/lib/measurements/helpers';
import type { MeasurementMetricId, MeasurementPeriod, MedicaoRecord } from '@/lib/measurements/types';
import { MEASUREMENT_COLORS, MEASUREMENT_METRICS } from '@/lib/measurements/types';

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
  backLabel = 'Dashboard',
  title = 'Medidas',
  subtitle = 'Sua evolução em números',
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

  const periodDelta = useMemo(
    () => computePeriodDelta(allValues, period),
    [allValues, period],
  );

  const historyEntries = useMemo(
    () => buildHistoryEntries(medicoes, metricId, metric.unit),
    [medicoes, metricId, metric.unit],
  );

  const chartPoints = chartData.map((d) => ({ date: d.date, value: d.value }));

  const content = (
    <>
      {variant === 'page' && backHref && (
        <Link
          href={backHref}
          className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold hover:opacity-80"
          style={{ color: MEASUREMENT_COLORS.primary }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      )}

      {variant === 'page' && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
            <p className="mt-0.5 text-[11px]" style={{ color: '#555' }}>
              {subtitle}
            </p>
          </div>
          {headerAction}
        </div>
      )}

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

      <MeasurementTabs selected={metricId} onChange={setMetricId} />

      <MeasurementCurrentCard
        label={`${metric.label} atual`}
        value={currentValue}
        unit={metric.unit}
        lastUpdated={lastUpdated}
        delta={periodDelta}
        deltaLabel="no período"
        period={period}
        onPeriodChange={setPeriod}
        chartData={chartPoints}
      />

      {!readOnly && onSubmitValue && dataRegistro && onDataRegistroChange && (
        <MeasurementInputCard
          unit={metric.unit}
          date={dataRegistro}
          placeholder={getPlaceholder?.(metricId) || '0'}
          submitting={submitting}
          error={inputError}
          onDateChange={onDataRegistroChange}
          onSubmit={(value) => onSubmitValue(metricId, value)}
        />
      )}

      <MeasurementHistoryList
        entries={historyEntries}
        showAll={showAllHistory}
        onSeeAll={() => setShowAllHistory(true)}
        onDelete={onDeleteEntry}
      />
    </>
  );

  if (variant === 'embedded') {
    return <div className="flex flex-col gap-4">{content}</div>;
  }

  return (
    <div
      className="min-h-screen p-4 pb-24 md:p-6 lg:p-10 lg:pl-28"
      style={{ backgroundColor: MEASUREMENT_COLORS.page, color: MEASUREMENT_COLORS.text }}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        {content}
      </div>
    </div>
  );
}
