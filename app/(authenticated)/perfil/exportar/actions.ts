// app/(authenticated)/perfil/exportar/actions.ts
// Server Action para exportar dados — chama export_user_data() do Supabase
// Retorna JSON para download como arquivo

'use server';

import { createClient } from '@/lib/supabase/server';

export async function exportUserDataAction() {
  try {
    const supabase = createClient();
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

    // Converter para blob JSON
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Retornar URL e filename para o client fazer download
    return {
      success: true,
      blobUrl: url,
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
