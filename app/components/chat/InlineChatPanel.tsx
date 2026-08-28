"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { UserCircle } from "@phosphor-icons/react";
import { getSafeSession } from "@/lib/authErrorHandler";
import { marcarMensagensLidas } from "@/lib/chat/actions";
import { useChat } from "@/lib/chat/realtime";
import { StudentAvatar } from "@/app/components/profile/StudentAvatar";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";

interface InlineChatPanelProps {
  conversaId: string;
  meuId: string;
  /** Chamado depois de marcar como lida — pai zera o badge/dot local sem recarregar tudo. */
  onRead?: () => void;
  /** Painel direito do chat desktop (2 colunas, estilo WhatsApp) — sem
   *  altura fixa (o pai controla via flex) e com cabeçalho próprio
   *  (avatar + nome + link pro perfil do aluno). Sem isso, é o accordion
   *  antigo (260px, embutido na linha da lista). */
  fullHeight?: boolean;
  alunoId?: string;
  nomeOutro?: string;
  avatarOutro?: string | null;
  sexoOutro?: string | null;
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

/** Conversa expandida inline na lista — não navega pra outra página/rota.
 *  Com `fullHeight`, vira o painel direito do chat desktop 2 colunas. */
export function InlineChatPanel({
  conversaId,
  meuId,
  onRead,
  fullHeight,
  alunoId,
  nomeOutro,
  avatarOutro,
  sexoOutro,
}: InlineChatPanelProps) {
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
    <div className={fullHeight ? "flex h-full min-h-0 flex-col" : "border-t border-border-subtle"}>
      {fullHeight && (
        <div className="flex shrink-0 items-center gap-3 border-b border-border-subtle px-4 py-3">
          <StudentAvatar name={nomeOutro ?? "Aluno"} avatarUrl={avatarOutro} sexo={sexoOutro} sizeClassName="h-9 w-9" />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{nomeOutro}</p>
          {alunoId && (
            <Link
              href={`/admin/aluno/${alunoId}`}
              title="Ver perfil do aluno"
              aria-label="Ver perfil do aluno"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:text-brand"
            >
              <UserCircle size={20} />
            </Link>
          )}
        </div>
      )}

      {/* Papel de parede neutra — igual ao WhatsApp, que também não usa a
       *  cor da marca no canvas de mensagens, só nas bolhas/UI. */}
      <div
        className={fullHeight ? "min-h-0 flex-1 overflow-y-auto px-5 py-4" : "overflow-y-auto px-5 py-4"}
        style={{
          height: fullHeight ? undefined : PANEL_HEIGHT_PX,
          backgroundColor: fullHeight ? "var(--filter-bg, #ebebf0)" : "#F4EBFC",
        }}
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

      <div className="shrink-0 bg-surface-1 px-3 py-3">
        <ChatInput conversaId={conversaId} onSent={appendLocal} />
      </div>
    </div>
  );
}
