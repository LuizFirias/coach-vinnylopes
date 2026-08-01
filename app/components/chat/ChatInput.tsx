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

export function ChatInput({ conversaId, onSent }: ChatInputProps) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleEnviar = async () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setTexto('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }

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
      className="flex items-center gap-2 px-3 py-3"
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
        placeholder="Digite uma mensagem..."
        rows={1}
        maxLength={4000}
        style={{
          flex: 1,
          boxSizing: 'border-box',
          height: 40,
          minHeight: 40,
          maxHeight: 120,
          fontSize: 16,
          fontWeight: 400,
          color: 'var(--text-primary, #1a1a1a)',
          background: 'var(--filter-bg, #ebebf0)',
          border: 'none',
          borderRadius: 20,
          padding: '0 14px',
          outline: 'none',
          resize: 'none',
          lineHeight: '40px',
          overflowY: 'auto',
          verticalAlign: 'middle',
        }}
        onInput={(e) => {
          const el = e.currentTarget;
          const multiline = el.value.includes('\n') || el.scrollHeight > 44;
          if (multiline) {
            el.style.lineHeight = '1.4';
            el.style.padding = '8px 14px';
            el.style.height = 'auto';
            el.style.height = `${Math.min(Math.max(el.scrollHeight, 40), 120)}px`;
          } else {
            el.style.lineHeight = '40px';
            el.style.padding = '0 14px';
            el.style.height = '40px';
          }
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
            ? 'linear-gradient(135deg, #c084fc, #9333ea, #7e22ce)'
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
