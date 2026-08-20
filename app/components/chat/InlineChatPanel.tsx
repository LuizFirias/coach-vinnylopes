"use client";

import { useEffect, useMemo } from "react";
import { getSafeSession } from "@/lib/authErrorHandler";
import { marcarMensagensLidas } from "@/lib/chat/actions";
import { useChat } from "@/lib/chat/realtime";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";

interface InlineChatPanelProps {
  conversaId: string;
  meuId: string;
  /** Chamado depois de marcar como lida — pai zera o badge/dot local sem recarregar tudo. */
  onRead?: () => void;
}

/** Altura visível — cabe ~4 mensagens antes de precisar rolar (padrão Nutrium). */
const PANEL_HEIGHT_PX = 260;

function dateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDateDivider(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Hoje";
  if (sameDay(d, yesterday)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

/** Conversa expandida inline na lista — não navega pra outra página/rota. */
export function InlineChatPanel({ conversaId, meuId, onRead }: InlineChatPanelProps) {
  const { mensagens, loading, bottomRef, appendLocal } = useChat(conversaId);

  useEffect(() => {
    if (!conversaId) return;
    void (async () => {
      const session = await getSafeSession();
      if (!session?.access_token) return;
      const result = await marcarMensagensLidas(session.access_token, conversaId);
      if (result.success) onRead?.();
    })();
  }, [conversaId]);

  const withDividers = useMemo(() => {
    let lastKey = "";
    return mensagens.map((msg) => {
      const key = dateKey(msg.enviada_em);
      const showDivider = key !== lastKey;
      lastKey = key;
      return { msg, showDivider };
    });
  }, [mensagens]);

  return (
    <div className="border-t border-border-subtle">
      {/* Papel de parede roxo claro — diferencia da lista branca acima */}
      <div
        className="overflow-y-auto px-5 py-4"
        style={{ height: PANEL_HEIGHT_PX, backgroundColor: "#F4EBFC" }}
      >
        {loading ? (
          <p className="text-center text-xs text-text-tertiary">Carregando...</p>
        ) : mensagens.length === 0 ? (
          <p className="mt-6 text-center text-xs text-text-tertiary">
            Nenhuma mensagem ainda. Diga olá!
          </p>
        ) : (
          withDividers.map(({ msg, showDivider }) => (
            <div key={msg.id}>
              {showDivider && (
                <p className="my-3 text-center text-[11px] font-medium text-brand">
                  {formatDateDivider(msg.enviada_em)}
                </p>
              )}
              <ChatBubble
                texto={msg.texto}
                enviada_em={msg.enviada_em}
                minha={msg.remetente_id === meuId}
                lida={!!msg.lida_em}
              />
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="bg-surface-1 px-3 py-3">
        <ChatInput conversaId={conversaId} onSent={appendLocal} />
      </div>
    </div>
  );
}
