import { z } from 'zod';

// Formato real de dados_sessao em historico_treinos (descoberto via discovery).
// - reps pode vir como string "12" ou inteiro 12 (inconsistente no banco)
// - peso_atual: 0 significa "não preenchido" (não peso corporal)
// - completado: false = série não executada, ignorar em KPIs/PRs
// - anterior: placeholder visual gerado pelo front — não usar para calcular

export const SerieSchema = z.object({
  ordem: z.number().int().min(1).max(20),
  reps: z.preprocess(
    (v) => (typeof v === 'string' ? parseInt(v, 10) || 0 : v),
    z.number().int().min(0).max(100)
  ),
  tecnica: z.string().nullable().optional(),
  peso_atual: z.number().min(0).max(1000),
  completado: z.boolean().default(false),
  anterior: z.string().optional(),
});

export const DadosSessaoSchema = z.object({
  series: z.array(SerieSchema),
  data_sessao: z.string().datetime(),
  nome_rotina: z.string(),
  nome_exercicio: z.string(),
});

export type Serie = z.infer<typeof SerieSchema>;
export type DadosSessao = z.infer<typeof DadosSessaoSchema>;
