/**
 * Navegação admin com retorno à origem.
 * Usa `returnUrl` na query — nunca confiar em router.back() (links diretos / refresh quebram).
 */

const ADMIN_PREFIX = "/admin";

/** Só permite paths internos do admin (bloqueia open redirect). */
export function resolveSafeReturnUrl(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (!raw) return fallback;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }
  if (!decoded.startsWith(ADMIN_PREFIX)) return fallback;
  if (decoded.startsWith("//") || decoded.includes("://")) return fallback;
  return decoded;
}

export function readReturnUrl(
  search: string | URLSearchParams,
  fallback: string,
): string {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  return resolveSafeReturnUrl(params.get("returnUrl"), fallback);
}

/** Anexa returnUrl a um href admin. */
export function withReturnUrl(href: string, returnUrl: string): string {
  const safe = resolveSafeReturnUrl(returnUrl, "");
  if (!safe) return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("returnUrl", safe);
  const q = params.toString();
  return q ? `${path}?${q}` : path;
}

/** Perfil do aluno na aba treinos. */
export function alunoTreinosReturnUrl(alunoId: string): string {
  return `/admin/aluno/${alunoId}?tab=treinos`;
}
