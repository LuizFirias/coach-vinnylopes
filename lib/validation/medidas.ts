// lib/validation/medidas.ts
// Validação de medidas com Zod
// Espelha os CHECK constraints do banco (MIGRATION-PLAN §5.1)
// + detecção de outliers para soft warnings (DESIGN-SPEC §4.5)

import { z } from 'zod';

export const MedidaSchema = z.object({
  peso:                z.number().min(30).max(300).nullable().optional(),
  altura:              z.number().min(100).max(250).nullable().optional(),
  gordura_corporal:    z.number().min(3).max(60).nullable().optional(),
  massa_magra:         z.number().min(20).max(200).nullable().optional(),
  pescoco:             z.number().min(25).max(60).nullable().optional(),
  ombros:              z.number().min(60).max(200).nullable().optional(),
  peitoral:            z.number().min(40).max(200).nullable().optional(),
  cintura:             z.number().min(40).max(200).nullable().optional(),
  abdomen:             z.number().min(40).max(200).nullable().optional(),
  quadril:             z.number().min(40).max(200).nullable().optional(),
  braco_direito:       z.number().min(15).max(80).nullable().optional(),
  braco_esquerdo:      z.number().min(15).max(80).nullable().optional(),
  antebraco_direito:   z.number().min(15).max(60).nullable().optional(),
  antebraco_esquerdo:  z.number().min(15).max(60).nullable().optional(),
  coxa_direita:        z.number().min(25).max(100).nullable().optional(),
  coxa_esquerda:       z.number().min(25).max(100).nullable().optional(),
  panturrilha_direita: z.number().min(20).max(70).nullable().optional(),
  panturrilha_esquerda:z.number().min(20).max(70).nullable().optional(),
  observacoes:         z.string().nullable().optional(),
});

export type MedidaInput = z.infer<typeof MedidaSchema>;

/**
 * Detecta se o novo valor é outlier (variação >25% vs última medida)
 * Se for, retorna aviso para soft warning dialog
 */
export function detectarOutlier(
  campo: keyof MedidaInput,
  novoValor: number | null | undefined,
  ultimoValor: number | null | undefined
): { ehOutlier: boolean; variacao?: number } {
  if (novoValor == null || ultimoValor == null) {
    return { ehOutlier: false };
  }

  const variacao = Math.abs((novoValor - ultimoValor) / ultimoValor);
  if (variacao > 0.25) {
    return {
      ehOutlier: true,
      variacao: variacao * 100,
    };
  }
  return { ehOutlier: false };
}

/**
 * Labels em PT-BR para cada medida (para usar em dialogs/forms)
 */
export const medidaLabels: Record<keyof MedidaInput, string> = {
  peso: 'Peso',
  altura: 'Altura',
  gordura_corporal: 'Gordura corporal',
  massa_magra: 'Massa magra',
  pescoco: 'Pescoço',
  ombros: 'Ombros',
  peitoral: 'Peitoral',
  cintura: 'Cintura',
  abdomen: 'Abdômen',
  quadril: 'Quadril',
  braco_direito: 'Braço direito',
  braco_esquerdo: 'Braço esquerdo',
  antebraco_direito: 'Antebraço direito',
  antebraco_esquerdo: 'Antebraço esquerdo',
  coxa_direita: 'Coxa direita',
  coxa_esquerda: 'Coxa esquerda',
  panturrilha_direita: 'Panturrilha direita',
  panturrilha_esquerda: 'Panturrilha esquerda',
  observacoes: 'Observações',
};

/**
 * Unidades padrão para cada medida
 */
export const medidaUnidades: Record<keyof MedidaInput, string> = {
  peso: 'kg',
  altura: 'cm',
  gordura_corporal: '%',
  massa_magra: 'kg',
  pescoco: 'cm',
  ombros: 'cm',
  peitoral: 'cm',
  cintura: 'cm',
  abdomen: 'cm',
  quadril: 'cm',
  braco_direito: 'cm',
  braco_esquerdo: 'cm',
  antebraco_direito: 'cm',
  antebraco_esquerdo: 'cm',
  coxa_direita: 'cm',
  coxa_esquerda: 'cm',
  panturrilha_direita: 'cm',
  panturrilha_esquerda: 'cm',
  observacoes: '',
};
