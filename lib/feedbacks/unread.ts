import { supabaseClient } from '@/lib/supabaseClient';

export const FEEDBACKS_UNREAD_EVENT = 'auron:feedbacks-unread-changed';

export function notifyFeedbacksUnreadChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(FEEDBACKS_UNREAD_EVENT));
}

export async function countUnreadFeedbacks(coachId: string): Promise<number> {
  const { count, error } = await supabaseClient
    .from('feedbacks_treinos')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .is('lido_em', null);

  if (error) {
    console.error('[countUnreadFeedbacks]', error);
    return 0;
  }
  return count ?? 0;
}

export async function markFeedbackRead(feedbackId: string): Promise<{ error?: string }> {
  const { error } = await supabaseClient
    .from('feedbacks_treinos')
    .update({ lido_em: new Date().toISOString() })
    .eq('id', feedbackId)
    .is('lido_em', null);

  if (error) return { error: error.message };
  notifyFeedbacksUnreadChanged();
  return {};
}

export async function markFeedbackUnread(feedbackId: string): Promise<{ error?: string }> {
  const { error } = await supabaseClient
    .from('feedbacks_treinos')
    .update({ lido_em: null })
    .eq('id', feedbackId);

  if (error) return { error: error.message };
  notifyFeedbacksUnreadChanged();
  return {};
}

export async function markAllFeedbacksRead(coachId: string): Promise<{ error?: string }> {
  const { error } = await supabaseClient
    .from('feedbacks_treinos')
    .update({ lido_em: new Date().toISOString() })
    .eq('coach_id', coachId)
    .is('lido_em', null);

  if (error) return { error: error.message };
  notifyFeedbacksUnreadChanged();
  return {};
}
