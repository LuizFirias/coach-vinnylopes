import { supabaseClient } from '@/lib/supabaseClient';

/** Avisa o coach (in-app, tempo real) que o aluno acabou de iniciar um treino. */
export async function sendTreinoIniciadoNotification(nomeRotina?: string): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (!session?.access_token) return;

    await fetch('/api/notifications/workout-started', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ nomeRotina: nomeRotina || '' }),
    });
  } catch (err) {
    // Best-effort — não deve travar o início do treino do aluno
    console.error('[sendTreinoIniciadoNotification]', err);
  }
}
