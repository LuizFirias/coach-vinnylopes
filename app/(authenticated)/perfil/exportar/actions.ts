// app/(authenticated)/perfil/exportar/actions.ts
// Server Action para exportar dados — chama export_user_data() do Supabase
// Retorna JSON string para o client fazer download como arquivo

'use server';

import { createClient } from '@/lib/supabase/server';

export async function exportUserDataAction(accessToken: string) {
  try {
    const supabase = createClient(accessToken);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    // Chamar função do Supabase que retorna dados do usuário em JSONB
    const { data, error } = await supabase.rpc('export_user_data');

    if (error) {
      console.error('[exportUserDataAction] Erro:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Sem dados para exportar' };
    }

    // Retornar os dados como string JSON — o client cria o Blob e inicia o download
    return {
      success: true,
      json: JSON.stringify(data, null, 2),
      filename: `meus-dados-${new Date().toISOString().split('T')[0]}.json`,
    };
  } catch (err) {
    console.error('[exportUserDataAction] Exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido'
    };
  }
}
