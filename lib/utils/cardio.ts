import { ZONAS_FC, type CardioIntensidade, type ZonaFC } from '@/lib/constants/cardio';

export type SexoBiologico = 'M' | 'F';

/** FC máxima estimada (Fox). Aproximação populacional, não medida individual. */
export function calcFcMax(idade: number): number {
  return 220 - idade;
}

export function calcZonaFC(fcMedia: number, fcMax: number): ZonaFC | null {
  if (!fcMedia || !fcMax || fcMax <= 0) return null;
  const pct = (fcMedia / fcMax) * 100;

  if (pct < 60) return 'Z1';
  if (pct < 70) return 'Z2';
  if (pct < 80) return 'Z3';
  if (pct < 90) return 'Z4';
  return 'Z5';
}

/**
 * Gasto energético por Keytel et al. (2005), J Sports Sci 23(3):289-97.
 * Válida para exercício submáximo contínuo — subestima HIIT e intervalados.
 */
export function calcKcal(params: {
  fcMedia: number;
  pesoKg: number;
  idade: number;
  sexo: SexoBiologico;
  duracaoMin: number;
}): number | null {
  const { fcMedia, pesoKg, idade, sexo, duracaoMin } = params;

  if (!fcMedia || !pesoKg || !idade || !duracaoMin) return null;
  if (fcMedia < 30 || fcMedia > 250) return null;
  if (pesoKg < 20 || pesoKg > 300) return null;

  const kcalPerMin =
    sexo === 'M'
      ? (-55.0969 + 0.6309 * fcMedia + 0.1988 * pesoKg + 0.2017 * idade) / 4.184
      : (-20.4022 + 0.4472 * fcMedia + 0.1263 * pesoKg + 0.074 * idade) / 4.184;

  if (kcalPerMin <= 0) return null;

  return Math.round(kcalPerMin * duracaoMin);
}

export function calcFcAlvo(
  fcMax: number,
  intensidade: CardioIntensidade,
): { min: number; max: number } {
  const faixas: Record<CardioIntensidade, { min: number; max: number }> = {
    leve: { min: 0.5, max: 0.7 },
    moderada: { min: 0.6, max: 0.8 },
    intensa: { min: 0.8, max: 1.0 },
  };
  const f = faixas[intensidade];
  return {
    min: Math.round(fcMax * f.min),
    max: Math.round(fcMax * f.max),
  };
}

export function calcIdade(dataNascimento: string): number | null {
  const nasc = new Date(dataNascimento);
  if (Number.isNaN(nasc.getTime())) return null;

  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;

  if (idade < 5 || idade > 120) return null;
  return idade;
}

/** `profiles.sexo` guarda 'masculino' | 'feminino' | 'outro'; Keytel só tem duas equações. */
export function normalizarSexo(sexo: string | null | undefined): SexoBiologico {
  return sexo === 'feminino' ? 'F' : 'M';
}

export function formatarDuracao(min: number): string {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

export function zonaLabel(zona: ZonaFC): string {
  return ZONAS_FC[zona].nome;
}

/** Domingo da semana corrente em 'YYYY-MM-DD' (hora local). */
export function inicioSemanaISO(ref = new Date()): string {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return toISODate(d);
}

export function toISODate(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
