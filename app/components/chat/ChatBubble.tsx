'use client';

type ChatBubbleProps = {
  texto: string;
  enviada_em: string;
  minha: boolean;
  lida: boolean;
};

export function ChatBubble({ texto, enviada_em, minha, lida }: ChatBubbleProps) {
  const hora = new Date(enviada_em).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`mb-1.5 flex ${minha ? 'justify-end' : 'justify-start'}`}>
      <div
        style={{
          maxWidth: '75%',
          padding: '8px 12px',
          borderRadius: minha ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: minha
            ? 'linear-gradient(135deg, #F5D061 0%, #D4A843 55%, #B8902F 100%)'
            : 'var(--filter-bg, #ebebf0)',
          color: minha ? '#fff' : 'var(--text-primary, #1a1a1a)',
          boxShadow: minha
            ? '0 2px 8px rgba(212, 168, 67,0.25)'
            : '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <p style={{ fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word', margin: 0 }}>
          {texto}
        </p>
        <div
          className="mt-1 flex items-center gap-1"
          style={{ justifyContent: minha ? 'flex-end' : 'flex-start' }}
        >
          <span
            style={{
              fontSize: 10,
              color: minha ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary, #aaa)',
            }}
          >
            {hora}
          </span>
          {minha && (
            <span
              style={{
                fontSize: 10,
                color: lida ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
              }}
              aria-label={lida ? 'Lida' : 'Enviada'}
            >
              {lida ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
