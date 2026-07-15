export type SubscriptionStatus =
  | "pending"
  | "authorized"
  | "paused"
  | "cancelled"
  | "past_due"
  | "expired"
  | "canceling"
  | null;

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  authorized: "Ativa",
  paused: "Pausada",
  cancelled: "Cancelada",
  past_due: "Em atraso",
  expired: "Expirada",
  canceling: "Cancelamento agendado",
};

export function getStatusLabel(status: string | null, isActive: boolean): string {
  if (!status) return isActive ? "Ativa" : "Sem assinatura";
  return STATUS_LABELS[status] || status;
}

/** Grace = current_period_end + 3 dias (espelha statusMapping). */
export function calcGracePeriodEnd(currentPeriodEnd: string | null | undefined): string | null {
  if (!currentPeriodEnd) return null;
  const d = new Date(currentPeriodEnd);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 3);
  return d.toISOString();
}

/** Data efetiva do grace para banner/UI. */
export function getEffectiveAccessEnd(
  currentPeriodEnd: string | null | undefined,
  gracePeriodEnd?: string | null | undefined,
): string | null {
  return gracePeriodEnd || currentPeriodEnd || null;
}

export function isAccessGranted(
  status: string | null,
  currentPeriodEnd: string | null,
  gracePeriodEnd?: string | null,
): boolean {
  if (!status) return false;
  if (status === "authorized") return true;
  if (status === "cancelled" || status === "pending" || status === "expired") return false;
  if (status === "canceling") {
    if (!currentPeriodEnd) return false;
    return new Date(currentPeriodEnd).getTime() >= Date.now();
  }
  if (status === "past_due" || status === "paused") {
    const accessEnd = getEffectiveAccessEnd(currentPeriodEnd, gracePeriodEnd);
    if (!accessEnd) return false;
    return new Date(accessEnd).getTime() >= Date.now();
  }
  return false;
}

export function getStatusBadgeClasses(status: string | null, isActive: boolean): string {
  if (status === "canceling") {
    return "bg-warning-subtle text-warning border-warning-border";
  }
  if (isActive || status === "authorized") {
    return "bg-success-subtle text-success border-success-border";
  }
  if (status === "pending") {
    return "bg-warning-subtle text-warning border-warning-border";
  }
  if (status === "paused" || status === "past_due") {
    return "bg-warning-subtle text-warning border-warning-border";
  }
  if (status === "expired" || status === "cancelled") {
    return "bg-danger-subtle text-danger border-danger-border";
  }
  return "bg-surface-3 text-text-secondary border-border-subtle";
}
