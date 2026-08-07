import "server-only";
import crypto from "crypto";

/**
 * Asaas manda um token estático fixo no header `asaas-access-token`
 * (configurado no painel do Asaas), bem mais simples que o HMAC do MP.
 * Comparação em tempo constante para evitar timing attack.
 */
export function verifyAsaasWebhookToken(receivedToken: string | null, expectedToken: string): boolean {
  if (!receivedToken) return false;

  const received = Buffer.from(receivedToken);
  const expected = Buffer.from(expectedToken);

  if (received.length !== expected.length) return false;

  return crypto.timingSafeEqual(received, expected);
}
