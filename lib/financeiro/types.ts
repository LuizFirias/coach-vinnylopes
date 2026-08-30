import type { CoachPlan } from "@/lib/coachPlans";

export type FormaPagamento =
  | "pix"
  | "dinheiro"
  | "cartao_credito"
  | "cartao_debito"
  | "transferencia"
  | "outro";

export type StatusHistoricoPagamento =
  | "pago"
  | "pendente"
  | "atrasado"
  | "cancelado";

export const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão de crédito" },
  { value: "cartao_debito", label: "Cartão de débito" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
];

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao_credito: "Crédito",
  cartao_debito: "Débito",
  transferencia: "Transferência",
  outro: "Outro",
};

/** YYYY-MM-DD no fuso local */
export function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * Início padrão do próximo período:
 * - se vencimento >= hoje → dia seguinte ao vencimento
 * - senão → hoje
 */
export function inicioPadraoRenovacao(
  dataExpiracao: string | null | undefined,
  hoje = new Date(),
): string {
  const hojeIso = toISODateLocal(hoje);
  if (!dataExpiracao) return hojeIso;
  const vencIso = dataExpiracao.slice(0, 10);
  if (vencIso >= hojeIso) {
    const d = parseISODateLocal(vencIso);
    d.setDate(d.getDate() + 1);
    return toISODateLocal(d);
  }
  return hojeIso;
}

/** Fim = início + duracao_meses (mesmo critério atual do app). */
export function fimPorDuracaoMeses(
  periodoInicioIso: string,
  duracaoMeses: number,
): string {
  const d = parseISODateLocal(periodoInicioIso);
  d.setMonth(d.getMonth() + Math.max(1, duracaoMeses));
  return toISODateLocal(d);
}

export function duracaoMesesDoPlano(
  slug: string | null | undefined,
  planos: CoachPlan[],
): number {
  const found = planos.find((p) => p.slug === (slug || "mensal"));
  return found?.duracao_meses ?? 1;
}

/** Data de caixa para agregações: data_pagamento ou fallback registrado_em. */
export function dataCaixaISO(row: {
  data_pagamento?: string | null;
  registrado_em?: string | null;
}): string | null {
  if (row.data_pagamento) return row.data_pagamento.slice(0, 10);
  if (row.registrado_em) {
    const d = new Date(row.registrado_em);
    if (!Number.isNaN(d.getTime())) return toISODateLocal(d);
  }
  return null;
}
