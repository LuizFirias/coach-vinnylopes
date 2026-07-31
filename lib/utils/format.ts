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
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  return `${m}:${ss}`;
}

export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  })
    .format(value)
    // Evita quebra tipográfica entre "R$" e o valor (espaço normal → NBSP)
    .replace(/^R\$\s+/, 'R$\u00a0');
}
