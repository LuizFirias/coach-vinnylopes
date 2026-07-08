export type SubscriptionStatus =
  | "pending"
  | "authorized"
  | "paused"
  | "cancelled"
  | "past_due"
  | null;

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  authorized: "Ativa",
  paused: "Pausada",
  cancelled: "Cancelada",
  past_due: "Em atraso",
};

export function getStatusLabel(status: string | null, isActive: boolean): string {
  if (!status) return isActive ? "Ativa" : "Sem assinatura";
  return STATUS_LABELS[status] || status;
}

export function isAccessGranted(
  status: string | null,
  currentPeriodEnd: string | null
): boolean {
  const now = new Date();

  if (status === "authorized") return true;

  if (status === "paused" || status === "cancelled") {
    if (!currentPeriodEnd) return false;
    return new Date(currentPeriodEnd) >= now;
  }

  return false;
}

export function getStatusBadgeClasses(status: string | null, isActive: boolean): string {
  if (isActive || status === "authorized") {
    return "bg-success-subtle text-success border-success-border";
  }
  if (status === "pending") {
    return "bg-warning-subtle text-warning border-warning-border";
  }
  if (status === "paused" || status === "past_due") {
    return "bg-warning-subtle text-warning border-warning-border";
  }
  return "bg-surface-3 text-text-secondary border-border-subtle";
}
