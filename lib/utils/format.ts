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
