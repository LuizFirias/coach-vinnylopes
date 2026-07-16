export type AuronSubscriptionStatus =
  | "pending"
  | "authorized"
  | "paused"
  | "cancelled"
  | "past_due"
  | "expired"
  | "canceling";

/**
 * Mapeia status do preapproval do Mercado Pago → status interno.
 * - paused (falha temporária de cobrança no MP) → past_due + grace
 * - cancelled → cancelamento definitivo (sem grace)
 * - canceling é interno (coach pediu cancelamento; MP ainda manda cancelled)
 */
export function mapMpPreapprovalStatus(mpStatus: string): AuronSubscriptionStatus {
  switch ((mpStatus || "").toLowerCase()) {
    case "authorized":
      return "authorized";
    case "paused":
      return "past_due";
    case "cancelled":
      return "cancelled";
    case "pending":
      return "pending";
    default:
      return "pending";
  }
}

/** Grace = current_period_end + 3 dias. */
export function calcGracePeriodEnd(currentPeriodEnd: string | null | undefined): string | null {
  if (!currentPeriodEnd) return null;
  const d = new Date(currentPeriodEnd);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 3);
  return d.toISOString();
}

/** Data efetiva usada no grace: grace_period_end ?? current_period_end */
export function getEffectiveAccessEnd(
  currentPeriodEnd: string | null | undefined,
  gracePeriodEnd?: string | null | undefined,
): string | null {
  return gracePeriodEnd || currentPeriodEnd || null;
}

/**
 * Liberação de acesso do coach:
 * - authorized → ativo
 * - canceling → ativo enquanto current_period_end >= now (cancelamento não é imediato)
 * - past_due / paused → grace até grace_period_end ?? current_period_end
 * - cancelled / expired / pending → revogado
 */
export function isAccessGranted(
  status: AuronSubscriptionStatus | string | null | undefined,
  currentPeriodEnd: string | null | undefined,
  gracePeriodEnd?: string | null | undefined,
): boolean {
  if (!status) return false;

  if (status === "authorized") return true;

  if (status === "cancelled" || status === "pending" || status === "expired") {
    return false;
  }

  // canceling: mantém acesso até o fim do ciclo pago
  if (status === "canceling") {
    if (!currentPeriodEnd) return false;
    const end = new Date(currentPeriodEnd).getTime();
    if (Number.isNaN(end)) return false;
    return end >= Date.now();
  }

  if (status === "past_due" || status === "paused") {
    const accessEnd = getEffectiveAccessEnd(currentPeriodEnd, gracePeriodEnd);
    if (!accessEnd) return false;
    return new Date(accessEnd).getTime() >= Date.now();
  }

  return false;
}
