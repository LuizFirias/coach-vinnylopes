export type AuronSubscriptionStatus =
  | "pending"
  | "authorized"
  | "paused"
  | "cancelled"
  | "past_due";

export function mapMpPreapprovalStatus(mpStatus: string): AuronSubscriptionStatus {
  switch (mpStatus) {
    case "authorized":
      return "authorized";
    case "paused":
      return "paused";
    case "cancelled":
      return "cancelled";
    case "pending":
    default:
      return "pending";
  }
}

export function isAccessGranted(
  status: AuronSubscriptionStatus,
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
