'use client';

import { useRef, useState } from 'react';
import { PaperPlaneTilt } from '@phosphor-icons/react';
import { getSafeSession } from '@/lib/authErrorHandler';
import { enviarMensagem } from '@/lib/chat/actions';
import type { ChatMensagem } from '@/lib/chat/queries';

type ChatInputProps = {
  conversaId: string;
  onSent?: (msg: ChatMensagem) => void;
};

/** Altura fixa (~2 linhas) — o texto/placeholder fica ancorado no topo,
 *  não centralizado verticalmente. Igual ao textarea rows=2 do Nutrium. */
const INPUT_HEIGHT_PX = 64;

export function ChatInput({ conversaId, onSent }: ChatInputProps) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleEnviar = async () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setTexto('');

    try {
      const session = await getSafeSession();
      if (!session?.access_token) {
        setTexto(t);
        return;
      }
      const result = await enviarMensagem(session.access_token, conversaId, t);
      if (!result.success) {
        setTexto(t);
        return;
      }
      if (result.mensagem && onSent) {
        onSent(result.mensagem as ChatMensagem);
      }
    } catch {
      setTexto(t);
    } finally {
      setEnviando(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleEnviar();
    }
  };

  const hasText = !!texto.trim();

  return (
    <div
      className="flex items-end gap-2 px-3 py-3"
      style={{
        borderTop: '1px solid var(--mobile-card-border, rgba(0,0,0,0.07))',
        background: 'var(--mobile-page-bg-solid, #fff)',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}
    >
      <textarea
        ref={textareaRef}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Digite uma mensagem"
        rows={2}
        maxLength={4000}
        style={{
          flex: 1,
          boxSizing: 'border-box',
          height: INPUT_HEIGHT_PX,
          fontSize: 16,
          fontWeight: 400,
          color: 'var(--text-primary, #1a1a1a)',
          background: 'var(--filter-bg, #ebebf0)',
          border: 'none',
          borderRadius: 16,
          // Placeholder/texto fixo no topo — mais distância do que antes (era centralizado).
          padding: '14px 14px 0',
          outline: 'none',
          resize: 'none',
          appearance: 'none',
          lineHeight: 1.4,
          overflowY: 'auto',
        }}
      />
      <button
        type="button"
        onClick={() => void handleEnviar()}
        disabled={!hasText || enviando}
        aria-label="Enviar"
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: 'none',
          background: hasText
            ? 'linear-gradient(135deg, #F5D061, #D4A843, #B8902F)'
            : 'var(--filter-bg, #ebebf0)',
          color: hasText ? '#fff' : '#bbb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: hasText ? 'pointer' : 'default',
          transition: 'all 0.15s',
          flexShrink: 0,
          touchAction: 'manipulation',
          opacity: enviando ? 0.7 : 1,
        }}
      >
        <PaperPlaneTilt size={18} weight="fill" />
      </button>
    </div>
  );
}
