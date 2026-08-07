import type { AuronSubscriptionStatus } from "@/lib/mercadopago/statusMapping";

// Reexporta o enum já usado por setUserAccess/isAccessGranted — não criar um novo.
export type { AuronSubscriptionStatus };
export {
  calcGracePeriodEnd,
  getEffectiveAccessEnd,
  isAccessGranted,
} from "@/lib/mercadopago/statusMapping";

/**
 * Status de assinatura do Asaas (ACTIVE/EXPIRED/INACTIVE) → status interno.
 * Ativação real de acesso é dirigida pelos eventos de PAGAMENTO (ver mapAsaasPaymentStatus),
 * este mapeamento cobre principalmente o desligamento (assinatura cancelada/expirada no Asaas).
 */
export function mapAsaasSubscriptionStatus(asaasStatus: string): AuronSubscriptionStatus {
  switch ((asaasStatus || "").toUpperCase()) {
    case "ACTIVE":
      return "authorized";
    case "EXPIRED":
    case "INACTIVE":
      return "cancelled";
    default:
      return "pending";
  }
}

/**
 * Status de cobrança do Asaas → status interno.
 * CONFIRMED/RECEIVED = pagamento entrou → libera acesso.
 * OVERDUE = atraso → carência (grace period), mesma regra já usada pro MP.
 */
export function mapAsaasPaymentStatus(asaasStatus: string): AuronSubscriptionStatus {
  switch ((asaasStatus || "").toUpperCase()) {
    case "CONFIRMED":
    case "RECEIVED":
    case "RECEIVED_IN_CASH":
      return "authorized";
    case "OVERDUE":
      return "past_due";
    case "REFUNDED":
    case "REFUND_REQUESTED":
    case "CHARGEBACK_REQUESTED":
      return "cancelled";
    default:
      return "pending";
  }
}
