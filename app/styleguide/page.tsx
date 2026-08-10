'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Barbell,
  Check,
  Copy,
  Moon,
  Warning,
  X,
  Lightning,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { GlassPanel, GLASS_VARIANT_META } from '@/components/ui/GlassPanel';
import { cn } from '@/lib/utils/cn';

const SECTIONS = [
  { id: 'brand', label: 'Marca' },
  { id: 'colors', label: 'Cores' },
  { id: 'typography', label: 'Tipografia' },
  { id: 'spacing', label: 'Espaçamento' },
  { id: 'radius', label: 'Radius' },
  { id: 'elevation', label: 'Elevação' },
  { id: 'components', label: 'Componentes' },
  { id: 'status', label: 'Status' },
  { id: 'rules', label: 'Regras' },
] as const;

type Swatch = { name: string; token: string; value: string; note?: string };

/** Neutros 60-30-10 — dark (page / card / input) */
const SURFACES_DARK: Swatch[] = [
  { name: 'Surface 0', token: '--surface-0', value: '#000000', note: 'Page bg (60%)' },
  { name: 'Surface 1', token: '--surface-1', value: '#141414', note: 'Card (30%)' },
  { name: 'Surface 2', token: '--surface-2', value: '#222222', note: 'Input / elevação — NÃO card' },
  { name: 'Surface 3', token: '--surface-3', value: '#2A2A2A', note: 'Overlay / divisor' },
  { name: 'Surface 4', token: '--surface-4', value: '#333333', note: 'Borda input' },
];

/** Neutros 60-30-10 — light (page / card / input) */
const SURFACES_LIGHT: Swatch[] = [
  { name: 'Surface 0', token: '--surface-0', value: '#FFFFFF', note: 'Page bg (60%)' },
  { name: 'Surface 1', token: '--surface-1', value: '#F7F7F7', note: 'Card (30%) — mais claro que input' },
  { name: 'Surface 2', token: '--surface-2', value: '#E8E8E8', note: 'Input / elevação — contraste sobre card' },
  { name: 'Surface 3', token: '--surface-3', value: '#DEDEDE', note: 'Overlay / divisor' },
  { name: 'Surface 4', token: '--surface-4', value: '#D4D4D4', note: 'Borda input' },
];

const BRAND: Swatch[] = [
  { name: 'Brand / Accent', token: '--brand-primary', value: '#751BB4', note: '≤10% — sidebar, CTAs, foco' },
  { name: 'Hover', token: '--brand-hover', value: '#8B2FD4' },
  { name: 'Pressed', token: '--brand-pressed', value: '#5E158F' },
];

const SEMANTIC: Swatch[] = [
  { name: 'Success', token: '--success', value: '#39c75a', note: 'Ativo / PR' },
  { name: 'Warning', token: '--warning', value: '#F59E0B', note: 'Atenção' },
  { name: 'Danger', token: '--danger', value: '#e05555', note: 'Erro / risco' },
  { name: 'Info', token: '--info', value: '#38BDF8', note: 'Info / sync' },
];

const TEXT_DARK: Swatch[] = [
  { name: 'Primary', token: '--text-primary', value: '#FFFFFF' },
  { name: 'Secondary', token: '--text-secondary', value: '#A1A1AA' },
  { name: 'Tertiary', token: '--text-tertiary', value: '#71717A' },
  { name: 'Disabled', token: '--text-disabled', value: '#52525B' },
];

const TEXT_LIGHT: Swatch[] = [
  { name: 'Primary', token: '--text-primary', value: '#09090B' },
  { name: 'Secondary', token: '--text-secondary', value: '#52525B' },
  { name: 'Tertiary', token: '--text-tertiary', value: '#888888' },
  { name: 'Disabled', token: '--text-disabled', value: '#A1A1AA' },
];

const AURON_CAL: Swatch[] = [
  { name: 'Done', token: '--cal-done', value: '#39c75a', note: 'Treino feito' },
  { name: 'Missed', token: '--cal-missed', value: '#e05555', note: 'Não realizado' },
  { name: 'Today', token: '--cal-today', value: '#751BB4', note: 'Dia atual' },
  { name: 'Upcoming', token: '--cal-upcoming', value: '#7a8aab', note: 'Futuro' },
  { name: 'Rest / muted', token: '--cal-rest', value: '#444444', note: 'Descanso' },
];

const TYPE_SCALE = [
  { label: '2xs', size: '11px', weight: '500', sample: 'LABEL UPPERCASE', className: 'text-[11px] font-medium tracking-[0.08em] uppercase' },
  { label: 'xs', size: '12px', weight: '400', sample: 'Texto auxiliar / meta', className: 'text-xs' },
  { label: 'sm', size: '14px', weight: '500', sample: 'Corpo compacto / tabela', className: 'text-sm font-medium' },
  { label: 'base', size: '16px', weight: '400', sample: 'Corpo padrão', className: 'text-base' },
  { label: 'lg', size: '18px', weight: '600', sample: 'Nome de exercício', className: 'text-lg font-semibold' },
  { label: 'xl', size: '20px', weight: '800', sample: 'Título de tela', className: 'text-xl font-extrabold' },
  { label: '2xl', size: '24px', weight: '800', sample: 'Headline de card', className: 'text-2xl font-extrabold tracking-tight' },
  { label: '4xl / KPI', size: '36–48px', weight: '900', sample: '83.0', className: 'text-4xl font-black tracking-display tabular-nums lining-nums' },
];

const SPACING = [
  { token: '--space-1', px: 4 },
  { token: '--space-2', px: 8 },
  { token: '--space-3', px: 12 },
  { token: '--space-4', px: 16 },
  { token: '--space-6', px: 24 },
  { token: '--space-8', px: 32 },
  { token: '--space-12', px: 48 },
  { token: '--space-16', px: 64 },
];

const RADII = [
  { token: '--radius-sm', px: 4, note: 'Badge' },
  { token: '--radius-md', px: 6, note: 'Chip' },
  { token: '--radius-lg', px: 8, note: 'Input' },
  { token: '--radius-xl', px: 10, note: 'Botão' },
  { token: 'rounded-[12px]', px: 12, note: 'Card' },
  { token: 'rounded-[20px]', px: 20, note: 'Dashboard card' },
  { token: '--radius-full', px: 9999, note: 'Só pills/tabs' },
];

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand mb-5"
    >
      {children}
    </h2>
  );
}

function SwatchCard({
  swatch,
  onCopy,
}: {
  swatch: Swatch;
  onCopy: (text: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onCopy(swatch.token)}
      className="group text-left rounded-xl border border-border-subtle bg-surface-1 overflow-hidden hover:border-brand/40 transition-colors"
    >
      <div className="h-16 w-full" style={{ backgroundColor: swatch.value }} />
      <div className="p-3 space-y-0.5">
        <p className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
          {swatch.name}
          <Copy size={12} className="opacity-0 group-hover:opacity-60 text-text-tertiary" />
        </p>
        <p className="text-[11px] font-mono text-text-tertiary">{swatch.token}</p>
        <p className="text-[11px] font-mono text-text-secondary">{swatch.value}</p>
        {swatch.note && (
          <p className="text-[10px] text-text-disabled pt-0.5">{swatch.note}</p>
        )}
      </div>
    </button>
  );
}

export default function StyleguidePage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [active, setActive] = useState('brand');
  const [demoSelect, setDemoSelect] = useState('200');
  const [demoUf, setDemoUf] = useState('SP');

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary">
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-0/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">
              Auron · Design System
            </p>
            <h1 className="text-lg font-extrabold tracking-tight">Style Guide</h1>
          </div>
          <div className="flex items-center gap-2">
            {copied && (
              <span className="hidden sm:inline text-[11px] text-success font-medium">
                Copiado: {copied}
              </span>
            )}
            <Link
              href="/"
              className="h-9 px-3 rounded-[10px] bg-surface-2 border border-border-subtle text-xs font-semibold text-text-secondary hover:text-text-primary inline-flex items-center"
            >
              Voltar
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
        <nav className="hidden lg:block sticky top-24 self-start space-y-1">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setActive(s.id)}
              className={cn(
                'block rounded-lg px-3 py-2 text-sm transition-colors',
                active === s.id
                  ? 'bg-brand/10 text-brand font-semibold'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-surface-2',
              )}
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-14 pb-24">
          {/* Brand */}
          <section>
            <SectionTitle id="brand">Marca</SectionTitle>
            <div className="rounded-2xl border border-border-subtle bg-surface-1 p-6 md:p-8 overflow-hidden relative">
              <div
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(80% 60% at 10% 0%, rgba(117, 27, 180,0.25), transparent 60%)',
                }}
              />
              <div className="relative">
                <p className="text-4xl md:text-5xl font-black tracking-tight">AURON</p>
                <p className="mt-2 text-sm text-text-secondary max-w-md leading-relaxed">
                  App de gestão de treinos para personal trainers e alunos. Visual dark-first,
                  tipografia Inter com hierarquia forte (800–900), azul só para ação.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-brand text-text-on-brand">
                    Primary action
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-success/15 text-success border border-success-border">
                    Success
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-danger/15 text-danger border border-danger-border">
                    Danger
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Colors */}
          <section>
            <SectionTitle id="colors">Cores</SectionTitle>
            <p className="text-sm text-text-secondary mb-6 max-w-2xl">
              Neutros 60-30-10 (page / card / input) + accent ≤10% em{" "}
              <code className="text-xs text-brand">app/design-tokens.css</code> — escopo global.
              Clique em um swatch para copiar o token CSS.
            </p>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-3">
              Surfaces — Dark
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
              {SURFACES_DARK.map((s) => (
                <SwatchCard key={`dark-${s.token}`} swatch={s} onCopy={copy} />
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-3">
              Surfaces — Light
            </p>
            <p className="text-[12px] text-text-secondary mb-3 max-w-2xl leading-relaxed">
              Card (#F7F7F7) fica um passo acima do page branco; input (#E8E8E8) um passo abaixo do card —
              evita card e campo com o mesmo cinza.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
              {SURFACES_LIGHT.map((s) => (
                <SwatchCard key={`light-${s.token}`} swatch={s} onCopy={copy} />
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-3">
              Brand / accent
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {BRAND.map((s) => (
                <SwatchCard key={s.token} swatch={s} onCopy={copy} />
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-3">
              Semânticas
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {SEMANTIC.map((s) => (
                <SwatchCard key={s.token} swatch={s} onCopy={copy} />
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-3">
              Texto — Dark
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {TEXT_DARK.map((s) => (
                <SwatchCard key={`text-dark-${s.token}`} swatch={s} onCopy={copy} />
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-3">
              Texto — Light
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {TEXT_LIGHT.map((s) => (
                <SwatchCard key={`text-light-${s.token}`} swatch={s} onCopy={copy} />
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-3">
              Calendário / status de treino
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {AURON_CAL.map((s) => (
                <SwatchCard key={s.token} swatch={s} onCopy={copy} />
              ))}
            </div>
          </section>

          {/* Typography */}
          <section>
            <SectionTitle id="typography">Tipografia</SectionTitle>
            <p className="text-sm text-text-secondary mb-6">
              Inter (UI) · JetBrains Mono (pesos, cargas, KPIs, código) · pesos 400–900.
              Variável CSS: <code className="text-xs text-brand font-mono">--font-mono</code>
            </p>
            <div className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
              {TYPE_SCALE.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 px-4 py-4"
                >
                  <div className="w-28 shrink-0">
                    <p className="text-[11px] font-mono text-brand">{row.label}</p>
                    <p className="text-[10px] text-text-disabled">
                      {row.size} · {row.weight}
                    </p>
                  </div>
                  <p className={cn('text-text-primary', row.className)}>{row.sample}</p>
                </div>
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mt-8 mb-3">
              Numerais (dados)
            </p>
            <div className="rounded-xl border border-card bg-surface-1 p-4 space-y-4">
              <div className="flex items-baseline gap-6">
                <div className="w-28 shrink-0">
                  <p className="text-[11px] font-mono text-brand">Sem ajuste</p>
                  <p className="text-[10px] text-text-disabled">padrão Inter</p>
                </div>
                <p className="text-2xl font-black text-text-primary">1 11 111 1.111</p>
              </div>
              <div className="flex items-baseline gap-6">
                <div className="w-28 shrink-0">
                  <p className="text-[11px] font-mono text-brand">tabular-nums</p>
                  <p className="text-[10px] text-text-disabled">lining-nums</p>
                </div>
                <p
                  className="text-2xl font-black text-text-primary"
                  style={{
                    fontVariantNumeric: 'tabular-nums lining-nums',
                    fontFeatureSettings: '"tnum" 1, "lnum" 1',
                  }}
                >
                  1 11 111 1.111
                </p>
              </div>
              <p className="text-[10px] text-text-disabled">
                Usar <code className="text-brand">tabular-nums lining-nums</code> em todos os
                valores numéricos. Token CSS:{' '}
                <code className="text-brand">--numeric-features</code> · Tracking display:{' '}
                <code className="text-brand">--tracking-display (-0.03em)</code>
              </p>
            </div>
          </section>

          {/* Spacing */}
          <section>
            <SectionTitle id="spacing">Espaçamento</SectionTitle>
            <p className="text-sm text-text-secondary mb-6">
              Grid 4/8pt. Gutter de tela: 16px mobile · 24px desktop.
            </p>
            <div className="space-y-3">
              {SPACING.map((s) => (
                <div key={s.token} className="flex items-center gap-4">
                  <span className="w-28 text-[11px] font-mono text-text-tertiary shrink-0">
                    {s.token}
                  </span>
                  <div
                    className="h-6 rounded-sm bg-brand/80"
                    style={{ width: s.px }}
                  />
                  <span className="text-[11px] text-text-disabled">{s.px}px</span>
                </div>
              ))}
            </div>
          </section>

          {/* Radius */}
          <section>
            <SectionTitle id="radius">Border radius</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {RADII.map((r) => (
                <div
                  key={r.token}
                  className="border border-border-subtle bg-surface-1 p-4 flex flex-col items-center gap-3"
                  style={{
                    borderRadius: r.px >= 9999 ? 9999 : r.px,
                  }}
                >
                  <div
                    className="w-14 h-14 bg-brand/30 border border-brand/50"
                    style={{ borderRadius: r.px >= 9999 ? 9999 : r.px }}
                  />
                  <div className="text-center">
                    <p className="text-[11px] font-mono text-text-secondary">{r.px === 9999 ? 'full' : `${r.px}px`}</p>
                    <p className="text-[10px] text-text-disabled">{r.note}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-text-tertiary">
              Pill (9999) só para status pills e tabs selecionadas — nunca em botões de ação.
            </p>
          </section>

          {/* Elevation */}
          <section>
            <SectionTitle id="elevation">Elevação</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { name: 'elev-1', shadow: '0 1px 2px rgba(0,0,0,0.30)' },
                { name: 'elev-2', shadow: '0 4px 12px rgba(0,0,0,0.45)' },
                { name: 'elev-3', shadow: '0 12px 32px rgba(0,0,0,0.55)' },
              ].map((e) => (
                <div
                  key={e.name}
                  className="rounded-xl bg-surface-1 border border-border-subtle p-5"
                  style={{ boxShadow: e.shadow }}
                >
                  <p className="text-sm font-semibold">{e.name}</p>
                  <p className="mt-1 text-[10px] font-mono text-text-tertiary break-all">
                    {e.shadow}
                  </p>
                </div>
              ))}
            </div>
            <div
              className="mt-4 rounded-xl bg-surface-1 border border-brand-border p-5"
              style={{ boxShadow: '0 0 24px rgba(117, 27, 180, 0.22)' }}
            >
              <p className="text-sm font-semibold text-brand">glow-brand</p>
              <p className="text-[10px] font-mono text-text-tertiary mt-1">
                Destaque pontual — não usar em massa
              </p>
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mt-6 mb-3">
              Bordas de card (dark mode)
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                {
                  name: '--border-card',
                  value: 'transparent',
                  note: 'Card padrão — sem outline',
                },
                {
                  name: '--border-card-hover',
                  value: 'rgba(255,255,255,0.06)',
                  note: 'Card interativo — hover',
                },
                {
                  name: '--border-input',
                  value: '#282828',
                  note: 'Input — sólido para toque',
                },
              ].map((b) => (
                <div
                  key={b.name}
                  className="rounded-xl bg-surface-1 p-4"
                  style={{ border: `1px solid ${b.value === 'transparent' ? 'var(--border-divider)' : b.value}` }}
                >
                  <p className="text-[11px] font-mono text-brand">{b.name}</p>
                  <p className="text-[10px] font-mono text-text-tertiary mt-0.5">{b.value}</p>
                  <p className="text-[10px] text-text-disabled mt-1">{b.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Components */}
          <section>
            <SectionTitle id="components">Componentes</SectionTitle>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-3">
              Buttons
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Button size="sm">Primary sm</Button>
              <Button>Primary md</Button>
              <Button size="lg">Primary lg</Button>
              <Button variant="primary-capsule" leftIcon={<Lightning size={18} weight="fill" />}>
                Iniciar treino
              </Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="success">Success</Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-3">
              Inputs &amp; Selects
            </p>
            <p className="text-[12px] text-text-secondary mb-4 max-w-2xl leading-relaxed">
              Componentes: <code className="text-brand font-mono text-[11px]">Input</code>
              {' '}e <code className="text-brand font-mono text-[11px]">Select</code>
              {' '}em <code className="font-mono text-[11px]">components/ui/</code>.
              Tokens theme-aware — funcionam em <strong className="text-text-primary font-medium">dark e light</strong>.
              Listas abrem como painel custom (nunca <code className="font-mono text-[11px]">&lt;select&gt;</code> nativo
              estilizado). Sem contorno branco/preto: <code className="font-mono text-[11px]">border-0</code>,
              contraste por <code className="font-mono text-[11px]">surface-2</code> sobre o card.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-4 max-w-2xl">
              <Input
                label="Busca"
                placeholder="Localizar..."
                leftIcon={<MagnifyingGlass size={16} />}
              />
              <Input
                label="Peso"
                placeholder="83"
                rightElement={<span className="text-[13px] font-medium text-text-tertiary">kg</span>}
              />
              <Input label="Com erro" placeholder="Valor" error="Campo obrigatório" defaultValue="" />
              <Input
                label="Com helper"
                placeholder="seu_usuario"
                helperText="Aparece no rodapé das imagens"
              />
              <Select
                label="Faixa de preço"
                value={demoSelect}
                onChange={setDemoSelect}
                placeholder="Não exibir"
                options={[
                  { value: '', label: 'Não exibir' },
                  { value: '150', label: 'A partir de R$ 150' },
                  { value: '200', label: 'A partir de R$ 200' },
                  { value: '300', label: 'A partir de R$ 300' },
                ]}
              />
              <Select
                label="UF"
                value={demoUf}
                onChange={setDemoUf}
                placeholder="—"
                options={[
                  { value: '', label: '—' },
                  { value: 'SP', label: 'SP' },
                  { value: 'RJ', label: 'RJ' },
                  { value: 'MG', label: 'MG' },
                ]}
              />
            </div>
            <ul className="mb-8 max-w-2xl space-y-1.5 text-[12px] text-text-secondary leading-relaxed list-disc pl-4">
              <li>
                <strong className="text-text-primary font-medium">Campo:</strong>{' '}
                <code className="font-mono text-[11px]">h-11</code>,{' '}
                <code className="font-mono text-[11px]">rounded-[10px]</code>,{' '}
                <code className="font-mono text-[11px]">bg-surface-2</code>, sem borda de contorno.
                Placeholder ~12px, texto do valor 13–14px.
              </li>
              <li>
                <strong className="text-text-primary font-medium">Lista:</strong>{' '}
                painel <code className="font-mono text-[11px]">rounded-xl</code> + sombra,
                opção ativa <code className="font-mono text-[11px]">text-brand bg-brand/10</code> + check.
                Reutilize <code className="font-mono text-[11px]">selectListboxClassName</code> /
                <code className="font-mono text-[11px]">selectOptionClassName</code> em autocompletes.
              </li>
              <li>
                <strong className="text-text-primary font-medium">Dark:</strong>{' '}
                card <code className="font-mono text-[11px]">#141414</code>, input{' '}
                <code className="font-mono text-[11px]">#222222</code> (surface-2).
              </li>
              <li>
                <strong className="text-text-primary font-medium">Light:</strong>{' '}
                card <code className="font-mono text-[11px]">#F7F7F7</code>, input{' '}
                <code className="font-mono text-[11px]">#E8E8E8</code> — campo sempre um tom
                mais escuro que o card.
              </li>
            </ul>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-3">
              Cards — Dark #141414 · Light #F7F7F7
            </p>
            <p className="text-[12px] text-text-secondary mb-3 max-w-2xl leading-relaxed">
              Todo card de conteúdo usa{' '}
              <code className="text-brand font-mono text-[11px]">bg-surface-1</code>
              {' '}(dark <code className="font-mono text-[11px]">#141414</code>, light{' '}
              <code className="font-mono text-[11px]">#F7F7F7</code>).
              Contraste page↔card: black/white → surface-1. Não usar{' '}
              <code className="font-mono text-[11px] text-danger">bg-surface-2</code> como
              fundo de card — surface-2 fica para inputs e elevação interna.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 mb-8">
              <Card>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">Default</p>
                <p className="text-sm font-semibold">Card padrão</p>
                <p className="text-[10px] font-mono text-text-disabled mt-2">bg-surface-1 · #141414 / #F7F7F7</p>
              </Card>
              <Card variant="primary">
                <p className="text-[10px] uppercase tracking-wider text-brand mb-1">Primary</p>
                <p className="text-sm font-semibold">Com glow brand</p>
                <p className="text-[10px] font-mono text-text-disabled mt-2">bg-surface-1 + border brand</p>
              </Card>
              <Card variant="interactive">
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">Interactive</p>
                <p className="text-sm font-semibold">Hover / press</p>
                <p className="text-[10px] font-mono text-text-disabled mt-2">bg-surface-1 → hover surface-2</p>
              </Card>
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-3">
              Glass panel — vidro espelhado
            </p>
            <p className="text-[12px] text-text-secondary mb-4 max-w-3xl leading-relaxed">
              Painel translúcido com <code className="text-brand font-mono text-[11px]">backdrop-blur</code>,
              brilho radial interno e borda clara. Usado em tooltips de KPI e sheet de ações prioritárias.
              Opacidade do fill: <strong className="text-text-primary font-medium">55%</strong>.
              Cada nível escurece a cor base em <strong className="text-text-primary font-medium">15%</strong>.
              Componente: <code className="text-brand font-mono text-[11px]">GlassPanel</code>.
            </p>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand/80 mb-2">
              Azul (brand)
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
              {GLASS_VARIANT_META.filter((v) => v.variant.startsWith('brand-')).map((item) => (
                <GlassPanel key={item.variant} variant={item.variant} className="p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/75 mb-1">
                    {item.label}
                  </p>
                  <p className="text-[11px] leading-relaxed text-white/92 mb-2">
                    Explicação breve do conteúdo do painel.
                  </p>
                  <p className="text-[9px] font-mono text-white/50">{item.note}</p>
                </GlassPanel>
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-success/80 mb-2">
              Verde (success)
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
              {GLASS_VARIANT_META.filter((v) => v.variant.startsWith('success-')).map((item) => (
                <GlassPanel key={item.variant} variant={item.variant} className="p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/75 mb-1">
                    {item.label}
                  </p>
                  <p className="text-[11px] leading-relaxed text-white/92 mb-2">
                    Confirmação ou status positivo.
                  </p>
                  <p className="text-[9px] font-mono text-white/50">{item.note}</p>
                </GlassPanel>
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-warning/80 mb-2">
              Amarelo (warning)
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
              {GLASS_VARIANT_META.filter((v) => v.variant.startsWith('warning-')).map((item) => (
                <GlassPanel key={item.variant} variant={item.variant} className="p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/75 mb-1">
                    {item.label}
                  </p>
                  <p className="text-[11px] leading-relaxed text-white/92 mb-2">
                    Alerta ou atenção necessária.
                  </p>
                  <p className="text-[9px] font-mono text-white/50">{item.note}</p>
                </GlassPanel>
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-3">
              KPI pattern
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Volume', value: '12.4k', unit: 'kg', color: '#751BB4' },
                { label: 'Peso', value: '83.0', unit: 'kg', color: '#39c75a' },
                { label: 'Treinos', value: '14', unit: '', color: '#F59E0B' },
                { label: 'Streak', value: '5', unit: 'sem', color: '#F97316' },
              ].map((k) => (
                <div
                  key={k.label}
                  className="rounded-xl border border-border-subtle bg-surface-1 p-4"
                >
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-tertiary mb-2">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-[3px]"
                      style={{ backgroundColor: k.color }}
                    />
                    {k.label}
                  </p>
                  <p className="text-4xl font-black tracking-display tabular-nums lining-nums leading-none">
                    {k.value}
                    {k.unit && (
                      <span className="ml-1.5 text-base font-bold text-brand">{k.unit}</span>
                    )}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary mb-3">
              Ícones (Phosphor)
            </p>
            <div className="flex flex-wrap gap-4 text-text-secondary">
              <Barbell size={22} weight="bold" className="text-brand" />
              <Check size={22} weight="bold" className="text-success" />
              <X size={22} weight="bold" className="text-danger" />
              <Moon size={22} weight="fill" />
              <Warning size={22} weight="bold" className="text-warning" />
              <Lightning size={22} weight="fill" className="text-brand" />
            </div>
          </section>

          {/* Status */}
          <section>
            <SectionTitle id="status">Status & pills</SectionTitle>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="rounded-md px-2 py-0.5 text-[11px] font-medium bg-success-subtle text-success border border-success-border">
                Ativo
              </span>
              <span className="rounded-md px-2 py-0.5 text-[11px] font-medium bg-warning-subtle text-warning border border-warning-border">
                Pendente
              </span>
              <span className="rounded-md px-2 py-0.5 text-[11px] font-medium bg-danger-subtle text-danger border border-danger-border">
                Em risco
              </span>
              <span className="rounded-md px-2 py-0.5 text-[11px] font-medium bg-brand-subtle text-brand border border-brand-border">
                Hoje
              </span>
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-surface-3 text-text-secondary">
                Tab / pill
              </span>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface-1 p-4 flex items-end gap-4">
              {[
                { c: '#39c75a', label: 'done' },
                { c: '#e05555', label: 'missed' },
                { c: '#751BB4', label: 'today' },
                { c: '#7a8aab', label: 'upcoming' },
              ].map((i) => (
                <div key={i.label} className="flex flex-col items-center gap-1">
                  <Barbell size={16} weight="bold" color={i.c} />
                  <span className="text-[9px] text-text-disabled">{i.label}</span>
                </div>
              ))}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[9px] font-bold italic text-[#444] tracking-tighter">zzz</span>
                <span className="text-[9px] text-text-disabled">rest</span>
              </div>
            </div>
          </section>

          {/* Rules */}
          <section>
            <SectionTitle id="rules">Regras rápidas</SectionTitle>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                {
                  ok: false,
                  title: 'Botão primário escuro',
                  detail:
                    'Nunca #1e3a7a nem bg-brand sólido — use bg-btn-primary (gradiente) + shadow-btn-glow',
                },
                {
                  ok: false,
                  title: 'Delta em pill colorido',
                  detail: 'Número colorido direto, sem container',
                },
                {
                  ok: false,
                  title: 'Empty state com ícone + texto longo',
                  detail: 'Hint discreto; preferir UI parcial',
                },
                {
                  ok: false,
                  title: 'Gráfico com mínimo de pontos',
                  detail:
                    'Sempre renderizar o gráfico — com 0 pontos: linha base; 1 ponto: dot isolado',
                },
                {
                  ok: false,
                  title: 'Delete sem confirmação',
                  detail:
                    'Todo delete abre modal com título + descrição + botão danger antes de executar',
                },
                {
                  ok: false,
                  title: 'Tabela sem versão mobile',
                  detail: 'Toda tabela tem variante card para < 768px — sem scroll horizontal',
                },
                {
                  ok: true,
                  title: 'KPI grande e pesado',
                  detail: '28–48px / weight 800–900 + unidade em brand',
                },
                {
                  ok: true,
                  title: 'Azul só para ação',
                  detail: 'CTA, links, valores em destaque — não status neutro',
                },
                {
                  ok: true,
                  title: 'Radius de botão 10px',
                  detail: 'Pill só em tabs/status — nunca em CTA',
                },
                {
                  ok: true,
                  title: 'Tap targets ≥ 44×44pt',
                  detail: 'Todo elemento interativo no mobile tem área mínima de toque de 44×44pt',
                },
                {
                  ok: true,
                  title: 'Atividade agrupada por aluno + dia',
                  detail: '"Luiz — 3 treinos" — nunca repetir o mesmo evento 3 vezes na lista',
                },
                {
                  ok: true,
                  title: 'Numerais tabular + lining',
                  detail:
                    'tabular-nums lining-nums em toda célula de dado numérico — sem pulos de posição',
                },
                {
                  ok: false,
                  title: 'Border sólida em cards dark',
                  detail:
                    'Cards sem outline branco — transparent; separação só por surface',
                },
                {
                  ok: true,
                  title: 'Glass panel para overlays',
                  detail:
                    'Tooltips, sheets e modais contextuais: GlassPanel com blur + brilho interno — não usar em cards estáticos de lista',
                },
                {
                  ok: false,
                  title: 'Card com surface-2 / tom de input',
                  detail:
                    'Nunca usar o cinza de input como fundo de card — dark card #141414, light #F7F7F7; surface-2 só em campos e chips',
                },
                {
                  ok: true,
                  title: 'Input + Select do design system',
                  detail:
                    'Usar components/ui/Input e Select — tokens surface/text (dark+light), border-0, lista custom com selectListboxClassName. Nunca <select> nativo para UI estilizada',
                },
                {
                  ok: false,
                  title: 'Lista de select com outline ou fundo cinza fora do token',
                  detail:
                    'Painel = surface-2 + sombra + opção ativa brand/10 — mesmo padrão de especialidades / descanso',
                },
              ].map((r) => (
                <div
                  key={r.title}
                  className={cn(
                    'rounded-xl border p-4',
                    r.ok
                      ? 'border-success-border bg-success-subtle/40'
                      : 'border-danger-border bg-danger-subtle/30',
                  )}
                >
                  <p
                    className={cn(
                      'text-xs font-bold mb-1',
                      r.ok ? 'text-success' : 'text-danger',
                    )}
                  >
                    {r.ok ? '✓ Faça' : '✕ Evite'} — {r.title}
                  </p>
                  <p className="text-[12px] text-text-secondary leading-relaxed">{r.detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[11px] text-text-disabled">
              Spec completo: <code>.claude/skills/auron-design/SKILL.md</code> · Tokens:{' '}
              <code>app/design-tokens.css</code>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
