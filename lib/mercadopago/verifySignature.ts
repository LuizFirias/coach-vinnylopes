import "server-only";
import crypto from "crypto";

export function verifyMpSignature(
  xSignature: string,
  xRequestId: string | null,
  dataId: string | null,
  secret: string
): boolean {
  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const [k, v] = part.trim().split("=");
    if (k && v) parts[k] = v;
  }

  const { ts, v1 } = parts;
  if (!ts || !v1) return false;

  const manifestParts: string[] = [];
  if (dataId) manifestParts.push(`id:${dataId.toLowerCase()}`);
  if (xRequestId) manifestParts.push(`request-id:${xRequestId}`);
  manifestParts.push(`ts:${ts}`);
  const manifest = manifestParts.join(";") + ";";

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(manifest);
  const computed = hmac.digest("hex");

  if (computed.length !== v1.length) return false;

  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(v1));
}
