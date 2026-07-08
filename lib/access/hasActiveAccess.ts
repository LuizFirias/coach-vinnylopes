export type CoachAccessProfile = {
  subscription_active?: boolean | null;
  account_type?: string | null;
};

export function hasActiveAccess(profile: CoachAccessProfile): boolean {
  const accountType = profile.account_type ?? "padrao";
  if (accountType === "teste" || accountType === "parceiro") {
    return true;
  }
  return profile.subscription_active === true;
}
