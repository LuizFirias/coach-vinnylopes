import 'server-only';
import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:suporte@auronfit.com.br';
  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Envia um push pra todos os dispositivos inscritos de um usuário.
 * Remove do banco as inscrições que o navegador já invalidou (410/404).
 * Best-effort — nunca lança, só loga.
 */
export async function sendPushToUser(
  adminClient: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<void> {
  ensureConfigured();
  if (!configured) return;

  const { data: subs, error } = await adminClient
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error || !subs?.length) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
      } catch (err: any) {
        const status = err?.statusCode;
        if (status === 404 || status === 410) {
          // Inscrição morta (navegador desinstalou/expirou) — limpa do banco
          await adminClient.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error('[sendPush] erro ao enviar', sub.endpoint, err?.message || err);
        }
      }
    }),
  );
}
