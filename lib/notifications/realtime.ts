'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { countNotificacoesNaoLidas } from '@/lib/notifications/queries';

/** Contagem de notificações in-app não lidas (Realtime). */
export function useNotificacoesNaoLidas(userId: string | null) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!userId) {
      setTotal(0);
      return;
    }

    let cancelled = false;
    void countNotificacoesNaoLidas().then((n) => {
      if (!cancelled) setTotal(n);
    });

    const channel = supabaseClient
      .channel(`notificacoes:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificacoes',
          filter: `destinatario_id=eq.${userId}`,
        },
        () => {
          void countNotificacoesNaoLidas().then((n) => {
            if (!cancelled) setTotal(n);
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabaseClient.removeChannel(channel);
    };
  }, [userId]);

  return total;
}
