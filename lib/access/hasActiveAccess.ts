export type CoachAccessProfile = {
  subscription_active?: boolean | null;
  account_type?: string | null;
};

// Coach Vinny não tem plano/assinatura (treinador único) — as colunas de
// assinatura do AURON (subscription_active, account_type) nem existem neste
// banco. Sempre libera acesso.
export function hasActiveAccess(_profile: CoachAccessProfile): boolean {
  return true;
}
