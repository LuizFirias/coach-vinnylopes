import { supabaseClient } from '@/lib/supabaseClient';
import type { CoachNotificationTipo } from '@/lib/notifications/templates';

export async function sendCoachNotification(
  alunoId: string,
  tipo: CoachNotificationTipo,
): Promise<{ ok: true; deduped?: boolean } | { ok: false; error: string }> {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session?.access_token) {
    return { ok: false, error: 'Sessão expirada. Faça login novamente.' };
  }

  const res = await fetch('/api/notifications/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ alunoId, tipo }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json.error || 'Não foi possível enviar a notificação.' };
  }

  return { ok: true, deduped: Boolean(json.deduped) };
}
