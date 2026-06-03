// app/(authenticated)/perfil/excluir/actions.ts
// Server Action para excluir conta — chama delete_user_account() do Supabase

'use server';

import { createClient } from '@/lib/supabase/server';

export async function deleteAccountAction(accessToken: string) {
  try {
    const supabase = createClient(accessToken);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Chamar função do Supabase que deleta conta
    const { error } = await supabase.rpc('delete_user_account');

    if (error) {
      console.error('[deleteAccountAction] Erro:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[deleteAccountAction] Exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido'
    };
  }
}
