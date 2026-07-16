/**
 * URL canônica do site (sem trailing slash).
 * Apex auronfit.com.br redireciona 308 → www na Vercel; webhooks do MP
 * em geral NÃO seguem redirect — notification_url deve ser sempre www.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.auronfit.com.br";

  let url = raw.trim().replace(/\/$/, "");

  try {
    const parsed = new URL(url);
    if (parsed.hostname === "auronfit.com.br") {
      parsed.hostname = "www.auronfit.com.br";
      url = parsed.toString().replace(/\/$/, "");
    }
  } catch {
    // mantém raw se não for URL válida
  }

  return url;
}
