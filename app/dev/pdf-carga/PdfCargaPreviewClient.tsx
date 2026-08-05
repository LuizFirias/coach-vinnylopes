'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ALUNO = 'Rafael Mendes';
const MOCK_PERIODO = 'Este mês';
const MOCK_START = '01/07/2026';
const MOCK_END = '31/07/2026';

const MOCK_KPIS = [
  { label: 'Volume Total Levantado', value: '24.350 kg' },
  { label: 'Treinos Realizados', value: '18 sessões' },
  { label: 'Duração Média por Treino', value: '62min' },
  { label: 'Frequência Semanal Média', value: '4,5 treinos/semana' },
];

const MOCK_EXERCICIOS = [
  { nome: 'Supino reto com barra', sessoes: '9×', series: '36', cargaMax: '110 kg' },
  { nome: 'Agachamento com barra no Smith', sessoes: '6×', series: '24', cargaMax: '100 kg' },
  { nome: 'Puxada com barra anatômica', sessoes: '8×', series: '32', cargaMax: '80 kg' },
  { nome: 'Leg press 45', sessoes: '6×', series: '24', cargaMax: '200 kg' },
  { nome: 'Desenvolvimento na máquina', sessoes: '5×', series: '20', cargaMax: '65 kg' },
  { nome: 'Stiff com barra', sessoes: '5×', series: '20', cargaMax: '70 kg' },
  { nome: 'Rosca direta com barra', sessoes: '7×', series: '28', cargaMax: '50 kg' },
  { nome: 'Tríceps barra V na polia', sessoes: '7×', series: '28', cargaMax: '45 kg' },
];

const MOCK_VOLUME_SEMANAL = [
  { label: '30/06', volume: 3200 },
  { label: '07/07', volume: 4100 },
  { label: '14/07', volume: 3850 },
  { label: '21/07', volume: 5200 },
  { label: '28/07', volume: 4980 },
];

const MOCK_GRUPOS = [
  { grupo: 'Quadríceps', series: 48, pct: 18, color: '#3b82f6' },
  { grupo: 'Posterior (Isquiotibiais)', series: 40, pct: 15, color: '#ec4899' },
  { grupo: 'Peito Médio', series: 36, pct: 14, color: '#e05555' },
  { grupo: 'Dorsais', series: 32, pct: 12, color: '#39c75a' },
  { grupo: 'Glúteos', series: 28, pct: 11, color: '#f97316' },
  { grupo: 'Tríceps', series: 28, pct: 11, color: '#751BB4' },
  { grupo: 'Bíceps', series: 20, pct: 8, color: '#9333ea' },
  { grupo: 'Ombro Lateral', series: 16, pct: 6, color: '#f59e0b' },
  { grupo: 'Panturrilha', series: 12, pct: 5, color: '#14b8a6' },
];

const MOCK_PROGRESSAO = [
  { date: '03/07', value: 95 },
  { date: '07/07', value: 100 },
  { date: '10/07', value: 100 },
  { date: '14/07', value: 105 },
  { date: '17/07', value: 105 },
  { date: '21/07', value: 107.5 },
  { date: '24/07', value: 107.5 },
  { date: '28/07', value: 110 },
  { date: '31/07', value: 110 },
];

const MOCK_EXERCICIO_SEL = 'Supino reto com barra';

// ─── PDF Page primitives ─────────────────────────────────────────────────────

const PAGE_W = 640;
const PAGE_RATIO = 1.4142; // A4
const L = 38, R = 602, W = R - L; // margins in px (scaled from 15/195mm)

function PdfPage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto flex flex-col overflow-hidden bg-white shadow-2xl"
      style={{ width: PAGE_W, minHeight: PAGE_W * PAGE_RATIO, fontFamily: 'Helvetica, Arial, sans-serif' }}
    >
      {children}
    </div>
  );
}

function PdfHeader({ subtitle }: { subtitle: string }) {
  const today = new Date().toLocaleDateString('pt-BR');
  return (
    <div
      className="relative flex flex-col items-center justify-center px-9.5"
      style={{ background: '#9333ea', height: 76 }}
    >
      {/* Logo centered */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo-auron-nome.svg"
        alt="Auronfit"
        style={{ height: 22, objectFit: 'contain' }}
      />
      {/* Meta row: left + right, bottom */}
      <div className="absolute bottom-2 left-0 right-0 flex items-center justify-between px-9.5">
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 8, letterSpacing: 0.5 }}>
          RELATÓRIO DE DINÂMICA DE CARGA
        </span>
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 8 }}>
          {subtitle}  ·  Emitido em: {today}
        </span>
      </div>
    </div>
  );
}

function PdfSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-9.5 pt-4">
      <p className="font-bold text-[#1f1f23]" style={{ fontSize: 11 }}>{children}</p>
      <div className="mt-1 h-px bg-[#dcdcdc]" />
    </div>
  );
}

function PdfTable({
  headers,
  rows,
  colWidths,
  lastAlign = 'right',
}: {
  headers: string[];
  rows: string[][];
  colWidths?: string[];
  lastAlign?: 'right' | 'center' | 'left';
}) {
  return (
    <div className="px-9.5 pt-2">
      <table className="w-full border-collapse" style={{ fontSize: 10 }}>
        <colgroup>
          {colWidths?.map((w, i) => <col key={i} style={{ width: w }} />)}
        </colgroup>
        <thead>
          <tr style={{ background: '#9333ea' }}>
            {headers.map((h, i) => (
              <th
                key={i}
                className="py-1.5 px-2.5 font-semibold text-white"
                style={{ textAlign: i === 0 ? 'left' : i === headers.length - 1 ? lastAlign : 'center' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? '#f9f9fb' : '#fff' }}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="py-1.5 px-2.5"
                  style={{
                    color: '#1f1f23',
                    fontWeight: ci === row.length - 1 ? 700 : 400,
                    textAlign: ci === 0 ? 'left' : ci === row.length - 1 ? lastAlign : 'center',
                    borderBottom: '1px solid #ebebeb',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PdfFooter({ page, total }: { page: number; total: number }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-9.5 py-3"
      style={{ borderTop: '1px solid #e8e8e8' }}
    >
      <span style={{ color: '#888', fontSize: 8 }}>AURONFIT — Relatório de Dinâmica de Carga</span>
      <span style={{ color: '#888', fontSize: 8 }}>Página {page} de {total}</span>
    </div>
  );
}

// ─── Chart 1: Volume semanal ─────────────────────────────────────────────────

function VolumeBarChart() {
  const data = MOCK_VOLUME_SEMANAL;
  const maxVol = Math.max(...data.map(d => d.volume));
  const labelTopH = 14; // reserved space above the tallest bar for the value label
  const barZoneH = 110;
  const totalH = barZoneH + 24;
  const n = data.length;
  const barW = Math.min(52, (W - 8 * (n - 1)) / n);
  const totalBarW = n * barW + (n - 1) * 8;
  const offsetX = (W - totalBarW) / 2;

  return (
    <div className="mx-9.5 mt-2" style={{ background: '#f8f8fc', padding: '10px 0 0 0' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${totalH}`} style={{ display: 'block' }}>
        {/* Baseline */}
        <line x1={0} y1={barZoneH} x2={W} y2={barZoneH} stroke="#dcdcdc" strokeWidth={1} />

        {data.map((d, i) => {
          // Leave labelTopH px at the top so the tallest bar's label is never clipped
          const maxBarH = barZoneH - labelTopH;
          const barH = Math.max(3, (d.volume / maxVol) * maxBarH);
          const x = offsetX + i * (barW + 8);
          const y = barZoneH - barH;
          const volLabel = d.volume >= 1000 ? `${(d.volume / 1000).toFixed(1)}t` : `${d.volume}`;

          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} fill="#9333ea" rx={2} />
              <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={9} fill="#9333ea" fontWeight="bold">
                {volLabel}
              </text>
              <text x={x + barW / 2} y={totalH - 4} textAnchor="middle" fontSize={9} fill="#888">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Chart 2: Grupos musculares ──────────────────────────────────────────────

function MuscleBarChart() {
  const data = MOCK_GRUPOS;
  const maxSeries = Math.max(...data.map(g => g.series));
  const labelW = 165;
  const barMaxW = W - labelW - 90;
  const rowH = 20;
  const rowGap = 3;
  const totalH = data.length * (rowH + rowGap);

  return (
    <div className="mx-9.5 mt-2">
      <svg width="100%" viewBox={`0 0 ${W} ${totalH}`} style={{ display: 'block' }}>
        {data.map((g, i) => {
          const y = i * (rowH + rowGap);
          const barW = (g.series / maxSeries) * barMaxW;

          return (
            <g key={i}>
              {/* Row bg */}
              {i % 2 === 0 && <rect x={0} y={y} width={W} height={rowH} fill="#f9f9fb" />}

              {/* Label */}
              <text x={4} y={y + rowH - 5} fontSize={9.5} fill="#333">{g.grupo}</text>

              {/* Bar bg */}
              <rect x={labelW} y={y + 4} width={barMaxW} height={rowH - 8} fill="#ede9fe" rx={2} />

              {/* Bar fill */}
              {barW > 0 && (
                <rect x={labelW} y={y + 4} width={barW} height={rowH - 8} fill={g.color} rx={2} />
              )}

              {/* Series count */}
              <text
                x={labelW + barMaxW + 8}
                y={y + rowH - 5}
                fontSize={9}
                fontWeight="bold"
                fill="#444"
              >
                {g.series}
              </text>

              {/* Pct */}
              <text
                x={labelW + barMaxW + 42}
                y={y + rowH - 5}
                fontSize={8.5}
                fill="#888"
              >
                {g.pct}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Chart 3: Progressão de carga ────────────────────────────────────────────

function ProgressionLineChart() {
  const data = MOCK_PROGRESSAO;
  const padT = 36, padB = 22, padL = 46, padR = 16;
  const totalH = 160;
  const cW = W - padL - padR;
  const cH = totalH - padT - padB;
  const minV = Math.min(...data.map(d => d.value));
  const maxV = Math.max(...data.map(d => d.value));
  const rng = maxV - minV || 1;

  const toX = (i: number) => padL + (i / (data.length - 1)) * cW;
  const toY = (v: number) => padT + cH - ((v - minV) / rng) * cH;

  const polyPoints = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');
  const delta = data[data.length - 1].value - data[0].value;
  const deltaColor = delta > 0 ? '#39c75a' : '#e05555';
  const deltaSign = delta > 0 ? '+' : '';

  return (
    <div className="mx-9.5 mt-2" style={{ background: '#f8f8fc' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${totalH}`} style={{ display: 'block' }}>
        {/* Grid lines + Y labels */}
        {[0, 0.5, 1].map(pct => {
          const gy = padT + cH * (1 - pct);
          const val = minV + rng * pct;
          return (
            <g key={pct}>
              <line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke="#dcdcdc" strokeWidth={0.8} />
              <text x={padL - 4} y={gy + 3} textAnchor="end" fontSize={8} fill="#aaa">
                {val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Line */}
        <polyline points={polyPoints} fill="none" stroke="#9333ea" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots + X labels */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(d.value)} r={3} fill="#9333ea" />
            <text x={toX(i)} y={totalH - 4} textAnchor="middle" fontSize={8} fill="#999">
              {d.date}
            </text>
          </g>
        ))}

        {/* Last value label */}
        <text
          x={toX(data.length - 1)}
          y={toY(data[data.length - 1].value) - 7}
          textAnchor="middle"
          fontSize={10}
          fontWeight="bold"
          fill="#9333ea"
        >
          {data[data.length - 1].value} kg
        </text>

        {/* Delta annotation — top left so it never overlaps the last-value label */}
        <text
          x={padL}
          y={padT - 8}
          textAnchor="start"
          fontSize={10}
          fontWeight="bold"
          fill={deltaColor}
        >
          {deltaSign}{delta.toFixed(1)} kg no período
        </text>
      </svg>
    </div>
  );
}

// ─── Preview ─────────────────────────────────────────────────────────────────

export function PdfCargaPreviewClient() {
  const [scale, setScale] = useState(1);

  return (
    <div className="min-h-screen" style={{ background: '#0a0f1e', color: '#fff' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b px-4 py-4"
        style={{ background: 'rgba(10,15,30,0.95)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#a78bfa' }}>
              Dev preview
            </p>
            <h1 className="text-lg font-bold tracking-tight">PDF — Dinâmica de Carga</h1>
            <p className="mt-0.5 text-xs" style={{ color: '#71717a' }}>
              Dados fictícios · {MOCK_ALUNO} · {MOCK_PERIODO} · 2 páginas · 3 gráficos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: '#71717a' }}>Zoom</span>
            {[0.65, 0.8, 1, 1.15].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setScale(s)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                  scale === s
                    ? 'border-violet-500 bg-violet-500/15 text-violet-300'
                    : 'border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200',
                )}
              >
                {Math.round(s * 100)}%
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 flex flex-col gap-14">
        {/* Page 1 */}
        <section className="flex flex-col gap-3">
          <p className="text-xs font-semibold" style={{ color: '#a78bfa' }}>
            Página 1 — Resumo · Gráfico de Volume Semanal · Top Exercícios
          </p>
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: PAGE_W,
              marginBottom: scale < 1 ? -(PAGE_W * (1 - scale) * PAGE_RATIO * 0.72) : 0,
            }}
          >
            <PdfPage>
              <PdfHeader subtitle={MOCK_PERIODO} />

              {/* Aluno */}
              <div className="px-9.5 pt-5">
                <p className="font-bold text-[#1f1f23]" style={{ fontSize: 11 }}>ALUNO</p>
                <p className="mt-0.5" style={{ color: '#555', fontSize: 10 }}>{MOCK_ALUNO}</p>
                <p style={{ color: '#888', fontSize: 10 }}>Período: {MOCK_START} a {MOCK_END}</p>
              </div>

              <PdfSectionTitle>RESUMO DO PERÍODO</PdfSectionTitle>
              <PdfTable
                headers={['Métrica', 'Resultado']}
                rows={MOCK_KPIS.map(k => [k.label, k.value])}
                colWidths={['68%', '32%']}
                lastAlign="right"
              />

              {/* Chart 1 */}
              <PdfSectionTitle>VOLUME SEMANAL</PdfSectionTitle>
              <VolumeBarChart />

              <PdfSectionTitle>TOP EXERCÍCIOS</PdfSectionTitle>
              <PdfTable
                headers={['Exercício', 'Sessões', 'Séries', 'Carga Máx.']}
                rows={MOCK_EXERCICIOS.map(e => [e.nome, e.sessoes, e.series, e.cargaMax])}
                colWidths={['46%', '14%', '14%', '26%']}
                lastAlign="right"
              />

              <PdfFooter page={1} total={2} />
            </PdfPage>
          </div>
        </section>

        {/* Page 2 */}
        <section className="flex flex-col gap-3">
          <p className="text-xs font-semibold" style={{ color: '#a78bfa' }}>
            Página 2 — Grupos Musculares · Progressão de Carga
          </p>
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: PAGE_W,
              marginBottom: scale < 1 ? -(PAGE_W * (1 - scale) * PAGE_RATIO * 0.72) : 0,
            }}
          >
            <PdfPage>
              <PdfHeader subtitle={MOCK_PERIODO} />

              {/* Chart 2 */}
              <PdfSectionTitle>VOLUME POR GRUPO MUSCULAR</PdfSectionTitle>
              <MuscleBarChart />

              {/* Chart 3 */}
              <PdfSectionTitle>
                PROGRESSÃO DE CARGA — {MOCK_EXERCICIO_SEL.toUpperCase()}
              </PdfSectionTitle>
              <ProgressionLineChart />

              <PdfFooter page={2} total={2} />
            </PdfPage>
          </div>
        </section>
      </main>

      <footer
        className="border-t px-4 py-6 text-center text-xs"
        style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#52525b' }}
      >
        Rota apenas em desenvolvimento ·{' '}
        <a href="/dev/share-cards" className="hover:underline" style={{ color: '#a78bfa' }}>Cards compartilháveis</a>
        {' · '}
        <a href="/api/auth/preview-email" className="hover:underline" style={{ color: '#a78bfa' }}>Preview de e-mails</a>
      </footer>
    </div>
  );
}
