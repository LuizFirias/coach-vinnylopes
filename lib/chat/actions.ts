'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Auth do app fica em localStorage — actions recebem accessToken do client
 * (mesmo padrão de cardio/actions).
 */

export async function enviarMensagem(
  accessToken: string,
  conversaId: string,
  texto: string,
): Promise<{ success: boolean; error?: string; mensagem?: Record<string, unknown> }> {
  try {
    const supabase = createClient(accessToken);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Não autenticado' };

    const textoLimpo = texto.trim();
    if (!textoLimpo || textoLimpo.length > 4000) {
      return { success: false, error: 'Texto inválido' };
    }

    const { data, error } = await supabase
      .from('chat_mensagens')
      .insert({
        conversa_id: conversaId,
        remetente_id: user.id,
        texto: textoLimpo,
      })
      .select('id, conversa_id, texto, enviada_em, lida_em, remetente_id')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, mensagem: data ?? undefined };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao enviar',
    };
  }
}

export async function marcarMensagensLidas(
  accessToken: string,
  conversaId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient(accessToken);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Não autenticado' };

    const { error } = await supabase.rpc('fn_marcar_lidas', {
      p_conversa_id: conversaId,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao marcar lidas',
    };
  }
}
