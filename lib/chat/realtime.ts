'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getMensagens, getTotalNaoLidas, type ChatMensagem } from './queries';

export function useChat(conversaId: string) {
  const [mensagens, setMensagens] = useState<ChatMensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversaId) return;
    let cancelled = false;
    setLoading(true);
    getMensagens(conversaId)
      .then((data) => {
        if (!cancelled) setMensagens(data);
      })
      .catch((err) => {
        console.error('[useChat]', err);
        if (!cancelled) setMensagens([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversaId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  useEffect(() => {
    if (!conversaId) return;

    const channel = supabaseClient
      .channel(`chat:${conversaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_mensagens',
          filter: `conversa_id=eq.${conversaId}`,
        },
        (payload) => {
          const nova = payload.new as ChatMensagem;
          setMensagens((prev) => {
            if (prev.some((m) => m.id === nova.id)) return prev;
            return [...prev, nova];
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_mensagens',
          filter: `conversa_id=eq.${conversaId}`,
        },
        (payload) => {
          const upd = payload.new as ChatMensagem;
          setMensagens((prev) =>
            prev.map((m) => (m.id === upd.id ? { ...m, lida_em: upd.lida_em } : m)),
          );
        },
      )
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [conversaId]);

  const appendLocal = useCallback((msg: ChatMensagem) => {
    setMensagens((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  return { mensagens, loading, bottomRef, appendLocal };
}

/** Badge do sino — total de não lidas em tempo real. */
export function useNaoLidasRealtime(userId: string | null, role: 'coach' | 'aluno') {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!userId) {
      setTotal(0);
      return;
    }

    let cancelled = false;
    void getTotalNaoLidas(userId, role).then((n) => {
      if (!cancelled) setTotal(n);
    });

    const filtro = role === 'coach' ? 'coach_id' : 'aluno_id';
    const channel = supabaseClient
      .channel(`nao_lidas:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversas',
          filter: `${filtro}=eq.${userId}`,
        },
        () => {
          void getTotalNaoLidas(userId, role).then((n) => {
            if (!cancelled) setTotal(n);
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabaseClient.removeChannel(channel);
    };
  }, [userId, role]);

  return total;
}
