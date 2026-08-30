/**
 * Resolve a key guardada no banco (ex.: "exercicios/uuid.gif") pra URL
 * pública do bucket R2. Sem "server-only" — usado também em client
 * components (ex.: tela de execução de treino).
 *
 * Convenção (igual lib/storageUrls.ts pro Supabase Storage): o banco guarda
 * só a key, nunca o host — troca de domínio/bucket no futuro não exige
 * migração de dado, só mudar NEXT_PUBLIC_R2_PUBLIC_URL.
 */
export function getPublicR2Url(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("http") || key.startsWith("data:") || key.startsWith("blob:")) return key;
  const base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  return `${base}/${key}`;
}
