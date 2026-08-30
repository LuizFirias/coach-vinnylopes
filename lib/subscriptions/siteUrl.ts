/**
 * URL canônica do site (sem trailing slash).
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.vinnylopescoach.site";

  return raw.trim().replace(/\/$/, "");
}
